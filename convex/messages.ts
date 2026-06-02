import { query } from "./_generated/server";
import { v } from "convex/values";

export const listByConversation = query({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== args.userId) return [];
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
