"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireSessionWithMonitoring } from "./auth";
import { getVapidPublicKey, isPushAlertsEnabled } from "./featureFlags";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  badgeCount?: number;
  badgeIncrement?: number;
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
      tag: "giga3-test",
      badgeIncrement: 1,
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
        tag: "giga3-sports",
      });
      if (ok) sent += 1;
    }
    return { sent };
  },
});

/** Broadcast a platform announcement to all subscribers who opted in. */
export const broadcastAnnouncement = internalAction({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isPushAlertsEnabled()) return { sent: 0 };

    const subs = await ctx.runQuery(internal.pushAlertsInternal.listAnnouncementSubscribers, {});
    const tag = `announcement-${Date.now()}`;
    let sent = 0;

    for (const sub of subs) {
      const isDuplicate = await ctx.runMutation(
        internal.pushNotificationDedupInternal.checkAndRecordDedup,
        { userId: sub.userId, tag, windowMs: 24 * 60 * 60 * 1000 }
      );
      if (isDuplicate) continue;

      const ok = await sendWebPush(sub, {
        title: args.title.slice(0, 80),
        body: args.body.slice(0, 240),
        url: args.url ?? "/chat/",
        tag,
      });
      if (ok) sent += 1;
    }

    return { sent };
  },
});
