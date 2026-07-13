"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getVapidPublicKey, isPushAlertsEnabled } from "./featureFlags";

export const PUSH_CATEGORY = {
  NEWS: "news",
  SPORTS: "sports",
  SOCIAL: "social",
  COMMENT: "comment",
  MENTION: "mention",
  FOLLOW: "follow",
  GENERATION: "generation",
  ANNOUNCEMENT: "announcement",
} as const;

export type PushCategory = (typeof PUSH_CATEGORY)[keyof typeof PUSH_CATEGORY];

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const MAX_QUEUE_ATTEMPTS = 5;

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

function categoryEnabled(
  sub: {
    muteAll?: boolean;
    newsAlerts: boolean;
    sportsAlerts: boolean;
    socialAlerts?: boolean;
    commentAlerts?: boolean;
    mentionAlerts?: boolean;
    followAlerts?: boolean;
    generationAlerts?: boolean;
    announcementAlerts?: boolean;
  },
  category: PushCategory
): boolean {
  if (sub.muteAll) return false;
  switch (category) {
    case PUSH_CATEGORY.NEWS:
      return sub.newsAlerts;
    case PUSH_CATEGORY.SPORTS:
      return sub.sportsAlerts;
    case PUSH_CATEGORY.SOCIAL:
      return sub.socialAlerts !== false;
    case PUSH_CATEGORY.COMMENT:
      return sub.commentAlerts !== false;
    case PUSH_CATEGORY.MENTION:
      return sub.mentionAlerts !== false;
    case PUSH_CATEGORY.FOLLOW:
      return sub.followAlerts !== false;
    case PUSH_CATEGORY.GENERATION:
      return sub.generationAlerts !== false;
    case PUSH_CATEGORY.ANNOUNCEMENT:
      return sub.announcementAlerts !== false;
    default:
      return true;
  }
}

/** Dispatch a push notification to all subscriptions for a user, respecting preferences. */
export const dispatchPushNotification = internalAction({
  args: {
    recipientId: v.string(),
    category: v.string(),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isPushAlertsEnabled()) return { sent: 0, queued: 0 };

    const category = args.category as PushCategory;
    const tag = args.tag ?? `${category}-${Date.now()}`;

    const isDuplicate = await ctx.runMutation(
      internal.pushNotificationDedupInternal.checkAndRecordDedup,
      { userId: args.recipientId, tag, windowMs: DEDUP_WINDOW_MS }
    );
    if (isDuplicate) return { sent: 0, queued: 0, deduplicated: true };

    const subs = await ctx.runQuery(internal.pushAlertsInternal.listSubscriptionsForUser, {
      userId: args.recipientId,
    });

    const payload: PushPayload = {
      title: args.title.slice(0, 80),
      body: args.body.slice(0, 240),
      url: args.url ?? "/chat/",
      tag,
    };

    let sent = 0;
    let queued = 0;

    for (const sub of subs) {
      if (!categoryEnabled(sub, category)) continue;

      const ok = await sendWebPush(sub, payload);
      if (ok) {
        sent += 1;
      } else {
        await ctx.runMutation(internal.pushNotificationDedupInternal.enqueuePush, {
          userId: args.recipientId,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          payloadJson: JSON.stringify(payload),
          tag,
          category,
        });
        queued += 1;
      }
    }

    return { sent, queued };
  },
});

/** Retry queued push notifications (cron). */
export const processPushQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isPushAlertsEnabled()) return { sent: 0, dropped: 0 };

    const rows = await ctx.runQuery(internal.pushNotificationDedupInternal.listQueuedPushes, {
      limit: 50,
    });

    let sent = 0;
    let dropped = 0;

    for (const row of rows) {
      if (row.attempts >= MAX_QUEUE_ATTEMPTS) {
        await ctx.runMutation(internal.pushNotificationDedupInternal.deleteQueuedPush, {
          queueId: row._id,
        });
        dropped += 1;
        continue;
      }

      let payload: PushPayload;
      try {
        payload = JSON.parse(row.payloadJson) as PushPayload;
      } catch {
        await ctx.runMutation(internal.pushNotificationDedupInternal.deleteQueuedPush, {
          queueId: row._id,
        });
        dropped += 1;
        continue;
      }

      const ok = await sendWebPush(
        { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
        payload
      );

      if (ok) {
        await ctx.runMutation(internal.pushNotificationDedupInternal.deleteQueuedPush, {
          queueId: row._id,
        });
        sent += 1;
      } else {
        await ctx.runMutation(internal.pushNotificationDedupInternal.incrementQueueAttempt, {
          queueId: row._id,
        });
      }
    }

    return { sent, dropped };
  },
});
