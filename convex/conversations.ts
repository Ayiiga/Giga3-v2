import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getSystemPrompt, isValidMode } from "./aiModes";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { conversationId: v.id("conversations"), userId: v.string() },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== args.userId) return null;
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
      userId: args.userId,
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
    if (!conv || conv.userId !== args.userId) throw new Error("Not found");
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
    if (!conv || conv.userId !== args.userId) throw new Error("Not found");
    const mode = isValidMode(args.mode) ? args.mode : "general";
    await ctx.db.patch(args.conversationId, { mode, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { conversationId: v.id("conversations"), userId: v.string() },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== args.userId) throw new Error("Not found");
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
