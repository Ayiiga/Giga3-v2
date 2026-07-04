import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const listSubscriptionsForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listNewsSubscribers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("pushSubscriptions").collect();
    return rows
      .filter((r) => r.newsAlerts)
      .map((r) => ({
        endpoint: r.endpoint,
        p256dh: r.p256dh,
        auth: r.auth,
      }));
  },
});

export const listSportsSubscribers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("pushSubscriptions").collect();
    return rows
      .filter((r) => r.sportsAlerts)
      .map((r) => ({
        endpoint: r.endpoint,
        p256dh: r.p256dh,
        auth: r.auth,
      }));
  },
});
