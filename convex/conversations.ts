import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getSystemPrompt, isValidMode } from "./aiModes";
import { normalizeUserId } from "./userIds";

async function listConversationsForUser(ctx: { db: any }, userId: string) {
  const normalized = normalizeUserId(userId);
  let rows = await ctx.db
    .query("conversations")
    .withIndex("by_user", (q: any) => q.eq("userId", normalized))
    .collect();
  const trimmed = userId.trim();
  if (rows.length === 0 && trimmed !== normalized) {
    rows = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q: any) => q.eq("userId", trimmed))
      .collect();
  }
  return rows.sort((a: { updatedAt: number }, b: { updatedAt: number }) => b.updatedAt - a.updatedAt);
}

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await listConversationsForUser(ctx, args.userId);
  },
});

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

export const get = query({
  args: { conversationId: v.id("conversations"), userId: v.string() },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, args.userId)) return null;
    return conv;
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    mode: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = isValidMode(args.mode) ? args.mode : "general";
    const now = Date.now();
    const title = args.title?.trim() || "New chat";
    return await ctx.db.insert("conversations", {
      userId: normalizeUserId(args.userId),
      title: title.slice(0, 80),
      mode,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, args.userId)) throw new Error("Not found");
    await ctx.db.patch(args.conversationId, {
      title: args.title.slice(0, 120),
      updatedAt: Date.now(),
    });
  },
});

export const setMode = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    mode: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, args.userId)) throw new Error("Not found");
    const mode = isValidMode(args.mode) ? args.mode : "general";
    await ctx.db.patch(args.conversationId, { mode, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { conversationId: v.id("conversations"), userId: v.string() },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, args.userId)) throw new Error("Not found");
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    await ctx.db.delete(args.conversationId);
  },
});

export const touch = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
  },
});
