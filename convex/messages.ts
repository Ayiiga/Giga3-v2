import { query } from "./_generated/server";
import { v } from "convex/values";
import { normalizeUserId } from "./userIds";

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
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, args.userId)) return [];
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
        content: m.content,
        createdAt: m.createdAt,
      }));
  },
});
