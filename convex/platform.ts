import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { normalizeUserId } from "./userIds";
import { SEGMENT_RECAP_PREFIX } from "./chatSegmentation";

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

export const appendMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: normalizeUserId(args.userId),
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
    if (args.role === "user" || args.role === "assistant") {
      await ctx.runMutation(internal.platformStatsRecorder.recordMessageInternal, {
        role: args.role,
      });
    }
  },
});

export const listConversationMessagesInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
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

export const listSegmentRecapInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    const recap = rows.find(
      (m) => m.role === "system" && m.content.startsWith(SEGMENT_RECAP_PREFIX)
    );
    if (!recap) return null;
    return recap.content.slice(SEGMENT_RECAP_PREFIX.length);
  },
});

export const getConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const updateConversationTitleInternal = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title.slice(0, 120),
      updatedAt: Date.now(),
    });
  },
});

/** Delete a message and every later message in the conversation (for regenerate). */
export const removeMessagesFrom = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    fromMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, args.userId)) {
      throw new Error("Conversation not found");
    }
    const fromMsg = await ctx.db.get(args.fromMessageId);
    if (!fromMsg || fromMsg.conversationId !== args.conversationId) {
      throw new Error("Message not found");
    }
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    const toDelete = rows.filter((m) => m.createdAt >= fromMsg.createdAt);
    for (const row of toDelete) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
  },
});
