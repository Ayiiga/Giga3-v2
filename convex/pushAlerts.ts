"use node";

import { action, internalAction, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireSession, requireSessionWithMonitoring } from "./auth";
import { getVapidPublicKey, isPushAlertsEnabled } from "./featureFlags";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:noreply@giga3ai.com";
  if (!publicKey || !privateKey) return false;

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(subject, publicKey, privateKey);
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch {
    return false;
  }
}

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

/** Send a test notification to the current user's subscription. */
export const sendTestPush = action({
  args: {
    sessionToken: v.string(),
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSessionWithMonitoring(args.sessionToken, ctx, "pushAlerts.test");
    if (!isPushAlertsEnabled()) {
      throw new Error("Push alerts are not enabled.");
    }
    const rows = await ctx.runQuery(internal.pushAlertsInternal.listSubscriptionsForUser, {
      userId: email,
    });
    const sub = rows.find((r) => r.endpoint === args.endpoint);
    if (!sub) throw new Error("Subscription not found.");

    const ok = await sendWebPush(sub, {
      title: "Giga3 alerts",
      body: "Push notifications are working.",
      url: "/chat/",
    });
    if (!ok) throw new Error("Could not send push notification. Check VAPID keys.");
    return { sent: true };
  },
});

export const notifyFromLiveNewsRefresh = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isPushAlertsEnabled()) return { sent: 0 };

    const briefing = await ctx.runQuery(internal.liveNewsInternal.getBriefingInternal, {});
    if (!briefing) return { sent: 0 };

    const topLine = briefing.split("\n").find((l) => l.startsWith("- "));
    if (!topLine) return { sent: 0 };

    const subs = await ctx.runQuery(internal.pushAlertsInternal.listNewsSubscribers, {});
    let sent = 0;
    for (const sub of subs) {
      const ok = await sendWebPush(sub, {
        title: "Giga3 news update",
        body: topLine.replace(/^- /, "").slice(0, 180),
        url: "/chat/",
      });
      if (ok) sent += 1;
    }
    return { sent };
  },
});

export const notifySportsLive = internalAction({
  args: {
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isPushAlertsEnabled()) return { sent: 0 };
    const subs = await ctx.runQuery(internal.pushAlertsInternal.listSportsSubscribers, {});
    let sent = 0;
    for (const sub of subs) {
      const ok = await sendWebPush(sub, {
        title: args.title,
        body: args.body,
        url: "/chat/",
      });
      if (ok) sent += 1;
    }
    return { sent };
  },
});
