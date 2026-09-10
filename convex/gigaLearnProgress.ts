import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";

const WEAKNESS_SCORE_THRESHOLD = 70;

function normalizeTopicKey(args: {
  topicKey?: string;
  subject?: string;
  curriculum?: string;
}): string {
  if (args.topicKey?.trim()) return args.topicKey.trim().slice(0, 120).toLowerCase();
  const parts = [args.curriculum, args.subject].filter(Boolean).map((p) => p!.trim().toLowerCase());
  return parts.join("/").slice(0, 120) || "general";
}

export const listProgress = query({
  args: {
    ...sessionArgs,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const cap = Math.min(args.limit ?? 20, 50);
    const rows = await ctx.db
      .query("gigaLearnProgress")
      .withIndex("by_user_updated", (q) => q.eq("userId", email))
      .order("desc")
      .take(cap);

    return rows.map((row) => ({
      id: row._id,
      topicKey: row.topicKey,
      subject: row.subject,
      curriculum: row.curriculum,
      weakness: row.weakness,
      practiceCount: row.practiceCount,
      lastScore: row.lastScore,
      lastAssessedAt: row.lastAssessedAt,
      needsReassess: row.needsReassess,
      updatedAt: row.updatedAt,
    }));
  },
});

export const recordAssessment = mutation({
  args: {
    sessionToken: v.string(),
    topicKey: v.optional(v.string()),
    subject: v.optional(v.string()),
    curriculum: v.optional(v.string()),
    weakness: v.optional(v.string()),
    score: v.number(),
    toolId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const topicKey = normalizeTopicKey(args);
    const now = Date.now();
    const score = Math.max(0, Math.min(100, Math.round(args.score)));

    const existing = await ctx.db
      .query("gigaLearnProgress")
      .withIndex("by_user_topic", (q) => q.eq("userId", email).eq("topicKey", topicKey))
      .first();

    const weakness =
      score < WEAKNESS_SCORE_THRESHOLD
        ? (args.weakness?.trim().slice(0, 500) ||
            args.subject?.replace(/-/g, " ") ||
            topicKey.replace(/\//g, " "))
        : undefined;

    const patch = {
      subject: args.subject,
      curriculum: args.curriculum,
      weakness,
      lastScore: score,
      lastAssessedAt: now,
      needsReassess: score < WEAKNESS_SCORE_THRESHOLD,
      practiceCount: existing?.practiceCount ?? 0,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("gigaLearnProgress", {
      userId: email,
      topicKey,
      ...patch,
    });
  },
});

export const recordPractice = mutation({
  args: {
    sessionToken: v.string(),
    topicKey: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const topicKey = args.topicKey.trim().slice(0, 120).toLowerCase();
    const row = await ctx.db
      .query("gigaLearnProgress")
      .withIndex("by_user_topic", (q) => q.eq("userId", email).eq("topicKey", topicKey))
      .first();
    if (!row) throw new Error("Topic not found. Complete an assessment first.");

    await ctx.db.patch(row._id, {
      practiceCount: row.practiceCount + 1,
      needsReassess: true,
      updatedAt: Date.now(),
    });
  },
});

/** Called from gigalearnStudio after quiz/practice generation. */
export const recordAssessmentInternal = internalMutation({
  args: {
    userId: v.string(),
    topicKey: v.optional(v.string()),
    subject: v.optional(v.string()),
    curriculum: v.optional(v.string()),
    score: v.optional(v.number()),
    toolId: v.string(),
  },
  handler: async (ctx, args) => {
    const assessTools = new Set([
      "quiz-generator",
      "practice-questions",
      "exam-prep",
      "revision-guide",
    ]);
    if (!assessTools.has(args.toolId)) return;

    const score = args.score ?? 65;
    const topicKey = normalizeTopicKey(args);
    const now = Date.now();
    const existing = await ctx.db
      .query("gigaLearnProgress")
      .withIndex("by_user_topic", (q) => q.eq("userId", args.userId).eq("topicKey", topicKey))
      .first();

    const weakness =
      score < WEAKNESS_SCORE_THRESHOLD
        ? args.subject?.replace(/-/g, " ") || topicKey.replace(/\//g, " ")
        : undefined;

    const patch = {
      subject: args.subject,
      curriculum: args.curriculum,
      weakness,
      lastScore: score,
      lastAssessedAt: now,
      needsReassess: score < WEAKNESS_SCORE_THRESHOLD,
      practiceCount: existing?.practiceCount ?? 0,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return;
    }

    await ctx.db.insert("gigaLearnProgress", {
      userId: args.userId,
      topicKey,
      ...patch,
    });
  },
});
