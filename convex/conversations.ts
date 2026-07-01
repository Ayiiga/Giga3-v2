import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isValidMode } from "./aiModes";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
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
  return rows.sort((a: { updatedAt: number; pinned?: boolean }, b: { updatedAt: number; pinned?: boolean }) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return b.updatedAt - a.updatedAt;
  });
}

async function patchConversationFlag(
  ctx: { db: any },
  args: {
    conversationId: string;
    userId: string;
    field: "pinned" | "archived" | "isFavorite";
    value: boolean;
  }
) {
  const conv = await ctx.db.get(args.conversationId);
  if (!userOwnsConversation(conv, args.userId)) throw new Error("Not found");
  await ctx.db.patch(args.conversationId, {
    [args.field]: args.value,
    updatedAt: Date.now(),
  });
  return { ok: true as const };
}

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

export const list = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    return await listConversationsForUser(ctx, userId);
  },
});

export const get = query({
  args: { conversationId: v.id("conversations"), ...sessionArgs },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, userId)) return null;
    return conv;
  },
});

export const create = mutation({
  args: {
    ...sessionArgs,
    mode: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const mode = isValidMode(args.mode) ? args.mode : "general";
    const now = Date.now();
    const title = args.title?.trim() || "New chat";
    const id = await ctx.db.insert("conversations", {
      userId: normalizeUserId(userId),
      title: title.slice(0, 80),
      mode,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.runMutation(internal.platformStatsRecorder.recordConversationCreatedInternal, {});
    return id;
  },
});

export const updateTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    ...sessionArgs,
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, userId)) throw new Error("Not found");
    await ctx.db.patch(args.conversationId, {
      title: args.title.slice(0, 120),
      updatedAt: Date.now(),
    });
  },
});

export const setMode = mutation({
  args: {
    conversationId: v.id("conversations"),
    ...sessionArgs,
    mode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, userId)) throw new Error("Not found");
    const mode = isValidMode(args.mode) ? args.mode : "general";
    await ctx.db.patch(args.conversationId, { mode, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { conversationId: v.id("conversations"), ...sessionArgs },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, userId)) throw new Error("Not found");
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
  args: { conversationId: v.id("conversations"), ...sessionArgs },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, userId)) throw new Error("Not found");
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
    ...sessionArgs,
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, userId)) throw new Error("Not found");
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

export const setPinned = mutation({
  args: {
    conversationId: v.id("conversations"),
    ...sessionArgs,
    pinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    return await patchConversationFlag(ctx, {
      conversationId: args.conversationId,
      userId,
      field: "pinned",
      value: args.pinned,
    });
  },
});

export const setArchived = mutation({
  args: {
    conversationId: v.id("conversations"),
    ...sessionArgs,
    archived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    return await patchConversationFlag(ctx, {
      conversationId: args.conversationId,
      userId,
      field: "archived",
      value: args.archived,
    });
  },
});

export const setFavorite = mutation({
  args: {
    conversationId: v.id("conversations"),
    ...sessionArgs,
    isFavorite: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    return await patchConversationFlag(ctx, {
      conversationId: args.conversationId,
      userId,
      field: "isFavorite",
      value: args.isFavorite,
    });
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
