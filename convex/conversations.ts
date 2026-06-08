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

function generateShareToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const setPublicShare = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, args.userId)) throw new Error("Not found");
    if (args.enabled) {
      const token = conv?.shareToken?.trim() || generateShareToken();
      await ctx.db.patch(args.conversationId, {
        sharePublic: true,
        shareToken: token,
        updatedAt: Date.now(),
      });
      return { shareToken: token, sharePublic: true as const };
    }
    await ctx.db.patch(args.conversationId, {
      sharePublic: false,
      shareToken: undefined,
      updatedAt: Date.now(),
    });
    return { shareToken: null, sharePublic: false as const };
  },
});

export const getPublicByShareToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    if (!token) return null;
    const conv = await ctx.db
      .query("conversations")
      .withIndex("by_share_token", (q) => q.eq("shareToken", token))
      .first();
    if (!conv?.sharePublic) return null;
    return {
      title: conv.title,
      mode: conv.mode,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  },
});
