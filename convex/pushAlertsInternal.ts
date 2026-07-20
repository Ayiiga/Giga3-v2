import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { parseUserPreferencesJson } from "./pushQuietHours";

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
      .filter((r) => r.newsAlerts && !r.muteAll)
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
      .filter((r) => r.sportsAlerts && !r.muteAll)
      .map((r) => ({
        endpoint: r.endpoint,
        p256dh: r.p256dh,
        auth: r.auth,
      }));
  },
});

export const listAnnouncementSubscribers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("pushSubscriptions").collect();
    return rows
      .filter((r) => r.announcementAlerts !== false && !r.muteAll)
      .map((r) => ({
        userId: r.userId,
        endpoint: r.endpoint,
        p256dh: r.p256dh,
        auth: r.auth,
      }));
  },
});

export const getUserNotificationPrefs = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) return { notificationsEnabled: true, quietHours: null };
    const prefs = parseUserPreferencesJson(user.userPreferences);
    return {
      notificationsEnabled: prefs?.notificationsEnabled !== false,
      quietHours: prefs,
    };
  },
});
