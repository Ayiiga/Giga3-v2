import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { getVapidPublicKey, isPushAlertsEnabled } from "./featureFlags";

export const getPushConfig = query({
  args: {},
  handler: async () => {
    return {
      enabled: isPushAlertsEnabled(),
      vapidPublicKey: getVapidPublicKey() ?? null,
    };
  },
});

export const savePushSubscription = mutation({
  args: {
    sessionToken: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    newsAlerts: v.optional(v.boolean()),
    sportsAlerts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!isPushAlertsEnabled()) {
      throw new Error("Push alerts are not enabled.");
    }
    const email = await requireSession(args.sessionToken);
    const now = Date.now();
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    const row = {
      userId: email,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      newsAlerts: args.newsAlerts ?? true,
      sportsAlerts: args.sportsAlerts ?? true,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, row);
      return existing._id;
    }

    return await ctx.db.insert("pushSubscriptions", {
      ...row,
      createdAt: now,
    });
  },
});

export const updatePushPreferences = mutation({
  args: {
    sessionToken: v.string(),
    endpoint: v.string(),
    newsAlerts: v.boolean(),
    sportsAlerts: v.boolean(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const row = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();
    if (!row || row.userId !== email) {
      throw new Error("Push subscription not found.");
    }
    await ctx.db.patch(row._id, {
      newsAlerts: args.newsAlerts,
      sportsAlerts: args.sportsAlerts,
      updatedAt: Date.now(),
    });
  },
});

export const removePushSubscription = mutation({
  args: {
    sessionToken: v.string(),
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const row = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();
    if (!row || row.userId !== email) return;
    await ctx.db.delete(row._id);
  },
});
