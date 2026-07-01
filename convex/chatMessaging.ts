import { mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import {
  assessImageProcessingCapability,
  getChatProviderLabel,
  type ChatCompletionAttachment,
} from "./chatEngine";
import { isValidMode, type AiModeId } from "./aiModes";
import {
  prepareAnswerQualityContext,
  recordQualityObservation,
  validateAnswerQuality,
} from "./answerQuality";
import { requireSession } from "./auth";
import {
  toUploadRecordFiles,
  validateAttachments,
  type RawAttachmentInput,
} from "./attachmentValidation";
import { normalizeUserId } from "./userIds";

const attachmentValidator = v.optional(
  v.array(
    v.object({
      kind: v.union(
        v.literal("image"),
        v.literal("document"),
        v.literal("archive"),
        v.literal("spreadsheet"),
        v.literal("presentation"),
        v.literal("pdf"),
        v.literal("text")
      ),
      name: v.string(),
      mimeType: v.optional(v.string()),
      sizeBytes: v.number(),
      text: v.optional(v.string()),
      dataUrl: v.optional(v.string()),
    })
  )
);

function imageCapabilityFailureMessage(
  status: "analysis_unavailable" | "upload_failed" | "unsupported_format",
  supportedFormats: string[]
): string {
  if (status === "analysis_unavailable") {
    return "Image analysis is currently unavailable. Please try again later or contact support.";
  }
  if (status === "upload_failed") {
    return "The image upload did not complete successfully. Please upload the image again.";
  }
  return `This image format is not currently supported. Supported formats include ${supportedFormats.join(", ")}.`;
}

function hasHallucinationRisk(flags: string[]): boolean {
  return flags.some((flag) =>
    [
      "missing_citations",
      "unsupported_claims",
      "fabricated_citations",
      "high_stakes_unverified",
      "ocr_not_verified",
      "image_analysis_unavailable",
      "attachment_analysis_unavailable",
    ].includes(flag)
  );
}

async function ensureChatUser(
  ctx: { db: any; scheduler: any },
  email: string
): Promise<void> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  if (!user) {
    await ctx.db.insert("users", {
      email,
      tokens: 12,
      plan: "free",
      tier: "free",
      subscriptionPlan: "free",
      credits: 0,
      starterCreditsGranted: false,
    });
    await ctx.scheduler.runAfter(0, internal.platformStats.incrementRegisteredUserInternal, {});
  }
  await ctx.scheduler.runAfter(0, internal.userStarterCredits.ensureStarterCredits, {
    email,
  });
}

/**
 * Fast accept path — saves the user message and queues AI in the background.
 * Uses a mutation (not action) so slow mobile networks get a quick ack.
 */
export const acceptMessage = mutation({
  args: {
    sessionToken: v.string(),
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
    mode: v.optional(v.string()),
    attachments: attachmentValidator,
    clientRequestId: v.optional(v.string()),
    chatSystem: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const normalizedEmail = normalizeUserId(email);
    const now = Date.now();

    let conversationId = args.conversationId;
    let conv = conversationId ? await ctx.db.get(conversationId) : null;

    if (conversationId) {
      if (!conv || conv.userId !== email) {
        throw new Error("Conversation not found");
      }
    } else {
      const mode =
        (args.mode && isValidMode(args.mode) ? args.mode : "general") as AiModeId;
      conversationId = await ctx.db.insert("conversations", {
        userId: normalizedEmail,
        title: "New chat",
        mode,
        createdAt: now,
        updatedAt: now,
      });
      conv = await ctx.db.get(conversationId);
      await ctx.scheduler.runAfter(
        0,
        internal.platformStatsRecorder.recordConversationCreatedInternal,
        {}
      );
    }

    await ensureChatUser(ctx, email);

    const mode =
      (args.mode && isValidMode(args.mode) ? args.mode : conv?.mode ?? "general") as AiModeId;
    const rawAttachments = (args.attachments ?? []) as RawAttachmentInput[];
    const attachments = rawAttachments as ChatCompletionAttachment[];
    const imageCapability = assessImageProcessingCapability(attachments);

    if (attachments.length > 0) {
      const maxFileBytes = await ctx.runQuery(
        internal.uploadLimitsInternal.getMaxFileBytesForUserInternal,
        { userId: email }
      );
      const validated = validateAttachments(rawAttachments, maxFileBytes);
      await ctx.scheduler.runAfter(0, internal.uploadLimits.recordUploadsInternal, {
        userId: email,
        files: toUploadRecordFiles(validated),
      });
    }

    if (conv && mode !== conv.mode) {
      await ctx.db.patch(conversationId!, { mode, updatedAt: now });
    }

    await ctx.db.insert("messages", {
      conversationId: conversationId!,
      userId: normalizedEmail,
      role: "user",
      content: args.content,
      createdAt: now,
    });
    await ctx.db.patch(conversationId!, { updatedAt: now });
    await ctx.scheduler.runAfter(0, internal.platformStatsRecorder.recordMessageInternal, {
      role: "user",
    });

    await ctx.scheduler.runAfter(0, api.users.recordChatInteraction, {
      sessionToken: args.sessionToken,
      mode,
      messageContent: args.content,
    });

    if (
      imageCapability.status === "analysis_unavailable" ||
      imageCapability.status === "upload_failed" ||
      imageCapability.status === "unsupported_format"
    ) {
      const failureMessage = imageCapabilityFailureMessage(
        imageCapability.status,
        imageCapability.supportedFormats
      );
      const validatedFailure = validateAnswerQuality({
        answer: failureMessage,
        context: prepareAnswerQualityContext({
          mode,
          query: args.content,
          attachments,
          history: [],
        }),
      });
      recordQualityObservation(validatedFailure.report);
      await ctx.scheduler.runAfter(0, internal.qualityDashboard.recordResponseMetric, {
        responseMode: validatedFailure.report.responseMode,
        confidenceLabel: validatedFailure.report.confidenceLabel,
        citationCount: validatedFailure.report.citationCount,
        verificationVisible: validatedFailure.report.verificationVisible,
        verificationPassed: !hasHallucinationRisk(validatedFailure.report.flags),
        hasHallucinationRisk: hasHallucinationRisk(validatedFailure.report.flags),
      });
      await ctx.db.insert("messages", {
        conversationId: conversationId!,
        userId: normalizedEmail,
        role: "assistant",
        content: validatedFailure.content,
        createdAt: Date.now(),
      });
      await ctx.scheduler.runAfter(0, internal.platformStatsRecorder.recordMessageInternal, {
        role: "assistant",
      });
      return {
        status: "complete" as const,
        conversationId: conversationId!,
        content: validatedFailure.content,
        chatProviderLabel: getChatProviderLabel("local_fallback"),
        usedFallback: true,
      };
    }

    if (args.clientRequestId) {
      const existing = await ctx.db
        .query("chatReplyJobs")
        .withIndex("by_clientRequest", (q) =>
          q.eq("clientRequestId", args.clientRequestId)
        )
        .first();
      if (existing && existing.status !== "failed" && existing.status !== "cancelled") {
        return {
          status: "processing" as const,
          conversationId: conversationId!,
          jobId: existing._id,
          chatProviderLabel: getChatProviderLabel("gemini"),
          usedFallback: false,
        };
      }
    }

    const jobId = await ctx.db.insert("chatReplyJobs", {
      conversationId: conversationId!,
      userId: email,
      mode,
      content: args.content,
      attachmentsJson:
        attachments.length > 0 ? JSON.stringify(attachments) : undefined,
      kind: "reply",
      clientRequestId: args.clientRequestId,
      chatSystem: args.chatSystem,
      cancelled: false,
      status: "pending",
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.chatReplyWorker.processJob, {
      jobId,
    });

    return {
      status: "processing" as const,
      conversationId: conversationId!,
      jobId,
      chatProviderLabel: getChatProviderLabel("gemini"),
      usedFallback: false,
    };
  },
});

/** Stop an in-flight AI reply for the active conversation. */
export const cancelReply = mutation({
  args: {
    sessionToken: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== email) {
      throw new Error("Conversation not found");
    }

    const active = await ctx.runQuery(internal.chatReplyJobs.getActiveJobForConversation, {
      conversationId: args.conversationId,
    });
    if (!active) return { ok: false as const };

    await ctx.runMutation(internal.chatReplyJobs.cancelJob, { jobId: active._id });
    return { ok: true as const };
  },
});

/** Async regenerate — removes assistant reply and queues background worker. */
export const regenerateMessage = mutation({
  args: {
    sessionToken: v.string(),
    conversationId: v.id("conversations"),
    assistantMessageId: v.id("messages"),
    mode: v.optional(v.string()),
    clientRequestId: v.optional(v.string()),
    chatSystem: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== email) {
      throw new Error("Conversation not found");
    }

    const target = await ctx.db.get(args.assistantMessageId);
    if (!target || target.conversationId !== args.conversationId) {
      throw new Error("Message not found");
    }
    if (target.role !== "assistant") {
      throw new Error("Can only regenerate assistant replies");
    }

    const mode =
      (args.mode && isValidMode(args.mode) ? args.mode : conv.mode ?? "general") as AiModeId;

    if (mode !== conv.mode) {
      await ctx.db.patch(args.conversationId, { mode, updatedAt: Date.now() });
    }

    await ctx.runMutation(internal.platform.removeMessagesFrom, {
      conversationId: args.conversationId,
      userId: email,
      fromMessageId: args.assistantMessageId,
    });

    const history = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    const dialogue = history
      .filter((m) => m.role !== "system")
      .sort((a, b) => a.createdAt - b.createdAt);
    const lastUser = [...dialogue].reverse().find((m) => m.role === "user");
    if (!lastUser) throw new Error("No user message to regenerate from");

    const jobId = await ctx.runMutation(internal.chatReplyJobs.createJob, {
      conversationId: args.conversationId,
      userId: email,
      mode,
      content: lastUser.content,
      kind: "regenerate",
      regenerateFromMessageId: args.assistantMessageId,
      clientRequestId: args.clientRequestId,
      chatSystem: args.chatSystem,
    });

    await ctx.scheduler.runAfter(0, internal.chatReplyWorker.processJob, {
      jobId,
    });

    return {
      status: "processing" as const,
      jobId,
      chatProviderLabel: getChatProviderLabel("gemini"),
      usedFallback: false,
    };
  },
});

/** Edit a user message, truncate later turns, and queue a fresh AI reply. */
export const editAndResend = mutation({
  args: {
    sessionToken: v.string(),
    messageId: v.id("messages"),
    content: v.string(),
    mode: v.optional(v.string()),
    clientRequestId: v.optional(v.string()),
    chatSystem: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const message = await ctx.db.get(args.messageId);
    if (!message || message.role !== "user") throw new Error("Message not found");

    const conv = await ctx.db.get(message.conversationId);
    if (!conv || conv.userId !== email) throw new Error("Forbidden");

    const content = args.content.trim();
    if (!content) throw new Error("Message cannot be empty");

    const mode =
      (args.mode && isValidMode(args.mode) ? args.mode : conv.mode ?? "general") as AiModeId;

    await ctx.db.patch(args.messageId, { content: content.slice(0, 50_000) });

    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", message.conversationId)
      )
      .collect();
    const toDelete = rows.filter((m) => m.createdAt > message.createdAt);
    for (const row of toDelete) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.patch(message.conversationId, { updatedAt: Date.now(), mode });

    const jobId = await ctx.runMutation(internal.chatReplyJobs.createJob, {
      conversationId: message.conversationId,
      userId: email,
      mode,
      content,
      kind: "reply",
      clientRequestId: args.clientRequestId,
      chatSystem: args.chatSystem,
    });

    await ctx.scheduler.runAfter(0, internal.chatReplyWorker.processJob, {
      jobId,
    });

    return {
      status: "processing" as const,
      jobId,
      chatProviderLabel: getChatProviderLabel("gemini"),
      usedFallback: false,
    };
  },
});
