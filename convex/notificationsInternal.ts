import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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
      .filter((row) => row.sentAt <= cutoff && !row.repeatSentAt && !row.tag.endsWith("-repeat"))
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
