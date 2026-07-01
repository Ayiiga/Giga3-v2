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
import { grantStarterCreditsIfNeeded } from "./userStarterCredits";

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

/**
 * Fast accept path — saves the user message and queues AI in the background.
 * Uses a mutation (not action) so slow mobile networks get a quick ack.
 */
export const acceptMessage = mutation({
  args: {
    sessionToken: v.string(),
    conversationId: v.id("conversations"),
    content: v.string(),
    mode: v.optional(v.string()),
    attachments: attachmentValidator,
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);

    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== email) {
      throw new Error("Conversation not found");
    }

    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      const userId = await ctx.db.insert("users", {
        email,
        tokens: 12,
        plan: "free",
        tier: "free",
        subscriptionPlan: "free",
        credits: 0,
        starterCreditsGranted: false,
      });
      await ctx.runMutation(internal.platformStats.incrementRegisteredUserInternal, {});
      const created = await ctx.db.get(userId);
      if (!created) throw new Error("Failed to create user");
      user = await grantStarterCreditsIfNeeded(ctx, email, created);
    } else {
      await grantStarterCreditsIfNeeded(ctx, email, user);
    }

    const mode =
      (args.mode && isValidMode(args.mode) ? args.mode : conv.mode ?? "general") as AiModeId;
    const rawAttachments = (args.attachments ?? []) as RawAttachmentInput[];
    const attachments = rawAttachments as ChatCompletionAttachment[];
    const imageCapability = assessImageProcessingCapability(attachments);

    if (attachments.length > 0) {
      const usage = await ctx.runQuery(api.uploadLimits.getUploadUsageSnapshot, {
        sessionToken: args.sessionToken,
      });
      try {
        const validated = validateAttachments(rawAttachments, usage.limits.maxFileBytes);
        await ctx.runMutation(internal.uploadLimits.recordUploadsInternal, {
          userId: email,
          files: toUploadRecordFiles(validated),
        });
      } catch (error) {
        throw error;
      }
    }

    if (mode !== conv.mode) {
      await ctx.db.patch(args.conversationId, { mode, updatedAt: Date.now() });
    }

    await ctx.runMutation(internal.platform.appendMessage, {
      conversationId: args.conversationId,
      userId: email,
      role: "user",
      content: args.content,
    });

    await ctx.runMutation(api.users.recordChatInteraction, {
      sessionToken: args.sessionToken,
      mode,
      messageContent: args.content,
    });

    const history = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    const dialogue = history
      .filter((m) => m.role !== "system")
      .sort((a, b) => a.createdAt - b.createdAt);

    const qualityContext = prepareAnswerQualityContext({
      mode,
      query: args.content,
      attachments,
      history: dialogue.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
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
        context: {
          ...qualityContext,
          requiresCitation: false,
          showConfidenceByDefault: false,
          showVerificationByDefault: false,
        },
      });
      recordQualityObservation(validatedFailure.report);
      await ctx.runMutation(internal.qualityDashboard.recordResponseMetric, {
        responseMode: validatedFailure.report.responseMode,
        confidenceLabel: validatedFailure.report.confidenceLabel,
        citationCount: validatedFailure.report.citationCount,
        verificationVisible: validatedFailure.report.verificationVisible,
        verificationPassed: !hasHallucinationRisk(validatedFailure.report.flags),
        hasHallucinationRisk: hasHallucinationRisk(validatedFailure.report.flags),
      });
      await ctx.runMutation(internal.platform.appendMessage, {
        conversationId: args.conversationId,
        userId: email,
        role: "assistant",
        content: validatedFailure.content,
      });
      return {
        status: "complete" as const,
        content: validatedFailure.content,
        chatProviderLabel: getChatProviderLabel("local_fallback"),
        usedFallback: true,
      };
    }

    const jobId = await ctx.runMutation(internal.chatReplyJobs.createJob, {
      conversationId: args.conversationId,
      userId: email,
      mode,
      content: args.content,
      attachmentsJson:
        attachments.length > 0 ? JSON.stringify(attachments) : undefined,
    });

    await ctx.scheduler.runAfter(0, internal.chatReplyWorker.processJob, {
      jobId,
    });

    return {
      status: "processing" as const,
      chatProviderLabel: getChatProviderLabel("gemini"),
      usedFallback: false,
    };
  },
});
