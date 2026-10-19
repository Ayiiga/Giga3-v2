import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { platformNotificationCategoryValidator } from "./schema";

export const listNotifications = query({
  args: {
    ...sessionArgs,
    limit: v.optional(v.number()),
    category: v.optional(platformNotificationCategoryValidator),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const limit = args.limit ?? 40;

    let rows = await ctx.db
      .query("platformNotifications")
      .withIndex("by_user_created", (q) => q.eq("userId", email))
      .order("desc")
      .take(limit * 2);

    if (args.category) {
      rows = rows.filter((r) => r.category === args.category);
    }

    const unreadCount = rows.filter((r) => !r.read).length;
    return {
      notifications: rows.slice(0, limit),
      unreadCount,
    };
  },
});

export const markNotificationRead = mutation({
  args: {
    ...sessionArgs,
    notificationId: v.id("platformNotifications"),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const row = await ctx.db.get(args.notificationId);
    if (!row || row.userId !== email) throw new Error("Not found");
    await ctx.db.patch(args.notificationId, { read: true });
    return { ok: true };
  },
});

export const markAllNotificationsRead = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const unread = await ctx.db
      .query("platformNotifications")
      .withIndex("by_user_read", (q) => q.eq("userId", email).eq("read", false))
      .take(100);
    for (const row of unread) {
      await ctx.db.patch(row._id, { read: true });
    }
    return { ok: true, count: unread.length };
  },
});

export const createNotificationInternal = internalMutation({
  args: {
    userId: v.string(),
    category: platformNotificationCategoryValidator,
    title: v.string(),
    body: v.string(),
    href: v.optional(v.string()),
    secondaryHref: v.optional(v.string()),
    secondaryLabel: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dedupeKey = args.dedupeKey?.trim().slice(0, 200) || undefined;
    if (dedupeKey) {
      const existing = await ctx.db
        .query("platformNotifications")
        .withIndex("by_dedupe", (q) => q.eq("dedupeKey", dedupeKey))
        .first();
      if (existing) {
        return { notificationId: existing._id, created: false as const };
      }
    }

    const notificationId = await ctx.db.insert("platformNotifications", {
      userId: args.userId,
      category: args.category,
      title: args.title.trim().slice(0, 160),
      body: args.body.trim().slice(0, 800),
      href: args.href?.trim().slice(0, 500),
      secondaryHref: args.secondaryHref?.trim().slice(0, 500),
      secondaryLabel: args.secondaryLabel?.trim().slice(0, 80),
      imageUrl: args.imageUrl?.trim().slice(0, 500),
      dedupeKey,
      read: false,
      createdAt: Date.now(),
    });
    return { notificationId, created: true as const };
  },
});
