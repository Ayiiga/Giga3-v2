import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
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

/** Insert user turn for synchronous conversational reply — no background job. */
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

    let conversationId = args.conversationId;
    if (conversationId) {
      const conv = await ctx.db.get(conversationId);
      if (!conv || conv.userId !== email) {
        throw new Error("Conversation not found");
      }
      if (args.clientRequestId) {
        const rows = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversationId!)
          )
          .order("desc")
          .take(6);
        const duplicateUser = rows.find(
          (m) => m.role === "user" && m.content === content && now - m.createdAt < 120_000
        );
        const duplicateAssistant = rows.find(
          (m) =>
            m.role === "assistant" &&
            duplicateUser &&
            m.createdAt >= duplicateUser.createdAt
        );
        if (duplicateUser && duplicateAssistant) {
          return {
            conversationId: conversationId!,
            since: duplicateUser.createdAt,
            content: duplicateAssistant.content,
            mode: conv.mode,
            personaId: conv.personaId,
            deduped: true as const,
          };
        }
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

    return {
      conversationId: conversationId!,
      since: now,
      mode: resolved.mode,
      personaId: resolved.personaId ?? undefined,
      deduped: false as const,
    };
  },
});
