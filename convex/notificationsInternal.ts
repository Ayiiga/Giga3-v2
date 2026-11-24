import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  engagementRemindersEnabled,
  getEngagementReminders,
} from "./engagementReminders";
import { ENGAGEMENT_REMINDER_PUSH_PREFIX } from "./engagementControls";
import { parseUserPreferencesJson } from "./pushQuietHours";

export const listRecentAssistantReplies = internalQuery({
  args: { since: v.number() },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").order("desc").take(200);
    const seen = new Set<string>();
    const out: { userId: string; conversationId: string }[] = [];
    for (const message of messages) {
      if (message.role !== "assistant" || (message.createdAt ?? 0) < args.since) continue;
      const conversation = await ctx.db.get(message.conversationId);
      if (!conversation?.userId) continue;
      const key = `${conversation.userId}:${message.conversationId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ userId: conversation.userId, conversationId: message.conversationId });
      if (out.length >= 30) break;
    }
    return out;
  },
});

export const listRecentSocialEvents = internalQuery({
  args: { since: v.number(), limit: v.number() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("socialNotifications")
      .order("desc")
      .take(args.limit);
    return notifications
      .filter((row) => row.createdAt >= args.since && !row.read)
      .map((row) => ({
        userId: row.recipientId,
        category: row.type === "mention" ? "mention" : "social",
        body:
          row.type === "like"
            ? "A friend liked your video"
            : row.message.slice(0, 120),
        tag: `social-${row._id}`,
      }));
  },
});

export const listGigaLearnReminderTargets = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    if (await engagementRemindersEnabled(ctx)) return [];
    const rows = await ctx.db.query("gigaLearnProgress").order("desc").take(args.limit);
    const ids = new Set<string>();
    for (const row of rows) {
      if (row.userId) ids.add(row.userId);
    }
    return [...ids];
  },
});

export const listCompletedMediaJobs = internalQuery({
  args: { since: v.number(), limit: v.number() },
  handler: async (ctx, args) => {
    const jobs = await ctx.db.query("mediaJobs").order("desc").take(args.limit * 3);
    return jobs
      .filter(
        (job) =>
          job.status === "succeeded" &&
          (job.completedAt ?? job.updatedAt ?? job.createdAt) >= args.since &&
          job.userId
      )
      .slice(0, args.limit)
      .map((job) => ({
        userId: job.userId,
        jobId: job._id,
      }));
  },
});

export const listRepeatCandidates = internalQuery({
  args: { olderThanMs: v.number(), limit: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;
    const rows = await ctx.db.query("pushNotificationDedup").order("desc").take(args.limit * 4);
    return rows
      .filter((row) =>
        row.sentAt <= cutoff &&
        !row.repeatSentAt &&
        !row.tag.endsWith("-repeat") &&
        !row.tag.startsWith(ENGAGEMENT_REMINDER_PUSH_PREFIX)
      )
      .slice(0, args.limit)
      .map((row) => ({
        _id: row._id,
        userId: row.userId,
        category: row.category ?? "announcement",
        title: row.title ?? "Giga3 AI",
        body: row.body ?? "You have a new update",
        url: row.url ?? "/chat/",
        tag: row.tag,
      }));
  },
});

export const markRepeatSent = internalMutation({
  args: { recordId: v.id("pushNotificationDedup") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recordId, { repeatSentAt: Date.now() });
  },
});

export const createEngagementReminders = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    if (!(await engagementRemindersEnabled(ctx))) return;
    const { page, isDone, continueCursor } = await ctx.db.query("users").paginate({
      cursor: args.cursor ?? null,
      numItems: 25,
    });
    const now = Date.now();
    for (const user of page) {
      if (user.accountStatus === "suspended") continue;
      if (parseUserPreferencesJson(user.userPreferences)?.notificationsEnabled === false) continue;

      for (const reminder of await getEngagementReminders(ctx, user, now)) {
        const dedupeKey = `${ENGAGEMENT_REMINDER_PUSH_PREFIX}${user._id}-${reminder.key}`;
        const { created } = await ctx.runMutation(internal.platformNotifications.createNotificationInternal, {
          userId: user.email,
          category: reminder.category,
          title: reminder.title,
          body: reminder.lead,
          href: reminder.ctaPath,
          dedupeKey,
        });
        if (!created) continue;

        await ctx.scheduler.runAfter(0, internal.pushNotificationDispatch.dispatchPushNotification, {
          recipientId: user.email,
          category: "announcement",
          title: reminder.title,
          body: reminder.lead,
          url: reminder.ctaPath,
          tag: `${ENGAGEMENT_REMINDER_PUSH_PREFIX}${reminder.key}`,
        });
        break;
      }
    }
    if (!isDone) {
      await ctx.scheduler.runAfter(0, internal.notificationsInternal.createEngagementReminders, {
        cursor: continueCursor,
      });
    }
  },
});

export const isEngagementReminderCurrent = internalQuery({
  args: { userId: v.string(), tag: v.string() },
  handler: async (ctx, args) => {
    if (!(await engagementRemindersEnabled(ctx))) return false;
    const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", args.userId)).first();
    if (!user || user.accountStatus === "suspended") return false;
    const reminders = await getEngagementReminders(ctx, user, Date.now());
    return reminders.some((reminder) => args.tag === `${ENGAGEMENT_REMINDER_PUSH_PREFIX}${reminder.key}`);
  },
});
