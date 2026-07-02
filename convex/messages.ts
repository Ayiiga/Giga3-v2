import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { sanitizePublicShareMessageContent } from "./publicShareSanitizer";

function userOwnsConversation(
  conv: { userId: string } | null,
  userId: string
): boolean {
  if (!conv) return false;
  const normalized = normalizeUserId(userId);
  return (
    conv.userId === normalized ||
    conv.userId === userId.trim() ||
    conv.userId === userId
  );
}

export const listByConversation = query({
  args: {
    conversationId: v.id("conversations"),
    ...sessionArgs,
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, userId)) return [];
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    return rows
      .filter((m) => m.role !== "system")
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const updateUserMessage = mutation({
  args: {
    messageId: v.id("messages"),
    ...sessionArgs,
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const message = await ctx.db.get(args.messageId);
    if (!message || message.role !== "user") throw new Error("Message not found");
    const conv = await ctx.db.get(message.conversationId);
    if (!userOwnsConversation(conv, userId)) throw new Error("Forbidden");
    const content = args.content.trim();
    if (!content) throw new Error("Message cannot be empty");
    await ctx.db.patch(args.messageId, { content: content.slice(0, 50_000) });
    await ctx.db.patch(message.conversationId, { updatedAt: Date.now() });
    return { ok: true as const };
  },
});

export const listPublicByShareToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    if (!token) return [];
    const conv = await ctx.db
      .query("conversations")
      .withIndex("by_share_token", (q) => q.eq("shareToken", token))
      .first();
    if (!conv?.sharePublic) return [];
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conv._id)
      )
      .collect();
    return rows
      .filter((m) => m.role !== "system")
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((m) => ({
        _id: m._id,
        role: m.role,
        content: sanitizePublicShareMessageContent(m.content),
        createdAt: m.createdAt,
      }));
  },
});
