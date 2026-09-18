import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { isPushAlertsEnabled } from "./featureFlags";

const REPEAT_AFTER_MS = 6 * 60 * 60 * 1000;

/** Every 15 min — nudge users with unread assistant replies. */
export const notifyUnreadChatReplies = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isPushAlertsEnabled()) return { sent: 0 };
    const since = Date.now() - 15 * 60 * 1000;
    const conversations = await ctx.runQuery(internal.notificationsInternal.listRecentAssistantReplies, {
      since,
    });
    let sent = 0;
    for (const row of conversations) {
      const result = await ctx.runAction(internal.pushNotificationDispatch.dispatchPushNotification, {
        recipientId: row.userId,
        category: "generation",
        title: "Giga3 AI",
        body: "You have a new reply in Giga3 Chat",
        url: "/chat/",
        tag: `chat-reply-${row.conversationId}`,
      });
      sent += result.sent ?? 0;
    }
    return { sent };
  },
});

/** Every 15 min — social likes/mentions digest line. */
export const notifySocialActivity = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isPushAlertsEnabled()) return { sent: 0 };
    const events = await ctx.runQuery(internal.notificationsInternal.listRecentSocialEvents, {
      since: Date.now() - 15 * 60 * 1000,
      limit: 40,
    });
    let sent = 0;
    for (const event of events) {
      const result = await ctx.runAction(internal.pushNotificationDispatch.dispatchPushNotification, {
        recipientId: event.userId,
        category: event.category,
        title: "GigaSocial",
        body: event.body,
        url: "/gigasocial/",
        tag: event.tag,
      });
      sent += result.sent ?? 0;
    }
    return { sent };
  },
});

/** Daily 7AM Ghana — GigaLearn reminder. */
export const notifyGigaLearnDaily = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isPushAlertsEnabled()) return { sent: 0 };
    const learners = await ctx.runQuery(internal.notificationsInternal.listGigaLearnReminderTargets, {
      limit: 80,
    });
    let sent = 0;
    for (const userId of learners) {
      const result = await ctx.runAction(internal.pushNotificationDispatch.dispatchPushNotification, {
        recipientId: userId,
        category: "announcement",
        title: "GigaLearn",
        body: "Continue learning: KG1 Counting Fruits 🍎",
        url: "/gigalearn/",
        tag: "gigalearn-daily",
      });
      sent += result.sent ?? 0;
    }
    return { sent };
  },
});

/** Every 15 min — completed media jobs. */
export const notifyCompletedMediaJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isPushAlertsEnabled()) return { sent: 0 };
    const jobs = await ctx.runQuery(internal.notificationsInternal.listCompletedMediaJobs, {
      since: Date.now() - 15 * 60 * 1000,
      limit: 40,
    });
    let sent = 0;
    for (const job of jobs) {
      const result = await ctx.runAction(internal.pushNotificationDispatch.dispatchPushNotification, {
        recipientId: job.userId,
        category: "generation",
        title: "Media Studio",
        body: "Your video is ready",
        url: "/media/",
        tag: `media-ready-${job.jobId}`,
      });
      sent += result.sent ?? 0;
    }
    return { sent };
  },
});

/** Re-notify once if a tagged push was not acted on within 6h (server-side queue). */
export const repeatUnseenNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isPushAlertsEnabled()) return { repeated: 0 };
    const rows = await ctx.runQuery(internal.notificationsInternal.listRepeatCandidates, {
      olderThanMs: REPEAT_AFTER_MS,
      limit: 30,
    });
    let repeated = 0;
    for (const row of rows) {
      const result = await ctx.runAction(internal.pushNotificationDispatch.dispatchPushNotification, {
        recipientId: row.userId,
        category: row.category,
        title: row.title,
        body: row.body,
        url: row.url,
        tag: `${row.tag}-repeat`,
      });
      repeated += result.sent ?? 0;
      await ctx.runMutation(internal.notificationsInternal.markRepeatSent, {
        recordId: row._id,
      });
    }
    return { repeated };
  },
});

export { REPEAT_AFTER_MS };
