import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { normalizeUserId } from "./userIds";
import { resolvePersonaForSend } from "./gigaPersonas";

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

async function resolveExistingQuickReplyTurn(
  ctx: { db: any },
  args: {
    email: string;
    clientRequestId: string;
  }
) {
  const existingJob = await ctx.db
    .query("chatReplyJobs")
    .withIndex("by_clientRequest", (q: any) =>
      q.eq("clientRequestId", args.clientRequestId)
    )
    .first();
  if (
    !existingJob ||
    existingJob.status === "failed" ||
    existingJob.status === "cancelled"
  ) {
    return null;
  }

  const conv = await ctx.db.get(existingJob.conversationId);
  if (!conv || conv.userId !== args.email) {
    throw new Error("Conversation not found");
  }

  const rows = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q: any) =>
      q.eq("conversationId", existingJob.conversationId)
    )
    .order("desc")
    .take(6);
  const assistant = rows.find(
    (m: { role: string; createdAt: number; content: string }) =>
      m.role === "assistant" && m.createdAt >= existingJob.createdAt
  );

  return {
    conversationId: existingJob.conversationId,
    since: existingJob.createdAt,
    mode: conv.mode,
    personaId: conv.personaId,
    jobId: existingJob._id,
    deduped: true as const,
    ...(assistant ? { content: assistant.content } : {}),
  };
}

/** Insert user turn for synchronous conversational reply — idempotent on clientRequestId. */
export const insertConversationalTurn = internalMutation({
  args: {
    email: v.string(),
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
    mode: v.optional(v.string()),
    personaId: v.optional(v.string()),
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const normalizedEmail = normalizeUserId(email);
    const now = Date.now();
    const content = args.content.trim();

    await ensureChatUser(ctx, email);

    if (args.clientRequestId) {
      const existing = await resolveExistingQuickReplyTurn(ctx, {
        email,
        clientRequestId: args.clientRequestId,
      });
      if (existing) {
        return existing;
      }
    }

    let conversationId = args.conversationId;
    if (conversationId) {
      const conv = await ctx.db.get(conversationId);
      if (!conv || conv.userId !== email) {
        throw new Error("Conversation not found");
      }
    } else {
      const resolved = resolvePersonaForSend({
        personaId: args.personaId,
        mode: args.mode,
      });
      conversationId = await ctx.db.insert("conversations", {
        userId: normalizedEmail,
        title: "New chat",
        mode: resolved.mode,
        personaId: resolved.personaId ?? undefined,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.platformStatsRecorder.recordConversationCreatedInternal,
        {}
      );
    }

    const conv = await ctx.db.get(conversationId!);
    const resolved = resolvePersonaForSend({
      personaId: args.personaId ?? conv?.personaId,
      mode: args.mode ?? conv?.mode,
    });
    if (resolved.personaId && conv?.personaId !== resolved.personaId) {
      await ctx.db.patch(conversationId!, {
        personaId: resolved.personaId,
        updatedAt: now,
      });
    }

    await ctx.db.insert("messages", {
      conversationId: conversationId!,
      userId: normalizedEmail,
      role: "user",
      content,
      createdAt: now,
    });
    await ctx.db.patch(conversationId!, { updatedAt: now });
    await ctx.scheduler.runAfter(0, internal.platformStatsRecorder.recordMessageInternal, {
      role: "user",
    });

    const jobId = await ctx.db.insert("chatReplyJobs", {
      conversationId: conversationId!,
      userId: email,
      mode: resolved.mode,
      content,
      kind: "conversational",
      clientRequestId: args.clientRequestId,
      personaId: resolved.personaId ?? undefined,
      cancelled: false,
      status: "pending",
      createdAt: now,
    });

    return {
      conversationId: conversationId!,
      since: now,
      mode: resolved.mode,
      personaId: resolved.personaId ?? undefined,
      jobId: jobId as Id<"chatReplyJobs">,
      deduped: false as const,
    };
  },
});
