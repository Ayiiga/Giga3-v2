import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const checkAndRecordDedup = internalMutation({
  args: {
    userId: v.string(),
    tag: v.string(),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushNotificationDedup")
      .withIndex("by_user_tag", (q) =>
        q.eq("userId", args.userId).eq("tag", args.tag)
      )
      .first();

    const now = Date.now();
    if (existing && now - existing.sentAt < args.windowMs) {
      return true;
    }

    if (existing) {
      await ctx.db.patch(existing._id, { sentAt: now });
    } else {
      await ctx.db.insert("pushNotificationDedup", {
        userId: args.userId,
        tag: args.tag,
        sentAt: now,
      });
    }

    return false;
  },
});

export const enqueuePush = internalMutation({
  args: {
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    payloadJson: v.string(),
    tag: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("pushNotificationQueue", {
      userId: args.userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      payloadJson: args.payloadJson,
      tag: args.tag,
      category: args.category,
      attempts: 0,
      createdAt: Date.now(),
    });
  },
});

export const listQueuedPushes = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cap = args.limit ?? 50;
    return await ctx.db
      .query("pushNotificationQueue")
      .withIndex("by_created")
      .order("asc")
      .take(cap);
  },
});

export const deleteQueuedPush = internalMutation({
  args: { queueId: v.id("pushNotificationQueue") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.queueId);
  },
});

export const incrementQueueAttempt = internalMutation({
  args: { queueId: v.id("pushNotificationQueue") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.queueId);
    if (!row) return;
    await ctx.db.patch(args.queueId, { attempts: row.attempts + 1 });
  },
});
