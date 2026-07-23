import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase5FlagEnabled } from "./phase5Controls";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

function utcDateKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

const DEFAULT_CHALLENGES = [
  {
    title: "Share one tip",
    description: "Post a helpful tip for your community today.",
    badgeId: "daily_tip",
  },
  {
    title: "Encourage a creator",
    description: "Leave a thoughtful comment on someone’s post.",
    badgeId: "daily_encourage",
  },
  {
    title: "Learn something new",
    description: "Ask Giga3 AI one study or skill question.",
    badgeId: "daily_learn",
  },
];

/** Ensure today’s challenge exists (idempotent). */
export const ensureTodayChallenge = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.community_growth"))) {
      throw new Error("Community growth challenges are not enabled.");
    }
    await requireSession(args.sessionToken);
    const dateKey = utcDateKey();
    const existing = await ctx.db
      .query("betaDailyChallenges")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .first();
    if (existing) return { challengeId: existing._id, dateKey };

    const dayNum = Math.floor(Date.now() / 86_400_000);
    const challenge = DEFAULT_CHALLENGES[dayNum % DEFAULT_CHALLENGES.length]!;
    const id = await ctx.db.insert("betaDailyChallenges", {
      dateKey,
      title: challenge.title,
      description: challenge.description,
      badgeId: challenge.badgeId,
      active: true,
      createdAt: Date.now(),
    });
    return { challengeId: id, dateKey };
  },
});

export const getTodayChallenge = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.community_growth"))) {
      return { enabled: false as const };
    }
    let userId: string;
    try {
      userId = await requireSession(args.sessionToken);
    } catch {
      return { enabled: true as const, challenge: null, completed: false };
    }
    const dateKey = utcDateKey();
    const challenge = await ctx.db
      .query("betaDailyChallenges")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .first();
    if (!challenge) {
      return { enabled: true as const, challenge: null, completed: false, dateKey };
    }
    const completion = await ctx.db
      .query("betaChallengeCompletions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("dateKey", dateKey))
      .first();
    return {
      enabled: true as const,
      dateKey,
      completed: Boolean(completion),
      challenge: {
        id: challenge._id,
        title: challenge.title,
        description: challenge.description,
        badgeId: challenge.badgeId,
      },
    };
  },
});

export const completeTodayChallenge = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.community_growth"))) {
      throw new Error("Community growth challenges are not enabled.");
    }
    const userId = await requireSession(args.sessionToken);
    const dateKey = utcDateKey();
    const challenge = await ctx.db
      .query("betaDailyChallenges")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .first();
    if (!challenge) throw new Error("No challenge available yet. Refresh and try again.");

    const existing = await ctx.db
      .query("betaChallengeCompletions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("dateKey", dateKey))
      .first();
    if (existing) return { ok: true, alreadyCompleted: true };

    await ctx.db.insert("betaChallengeCompletions", {
      userId,
      challengeId: challenge._id,
      dateKey,
      completedAt: Date.now(),
    });

    // Achievement badge (reuse userAchievements)
    const badgeId = `challenge_${challenge.badgeId}`;
    const earned = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_badge", (q) => q.eq("userId", userId).eq("badgeId", badgeId))
      .first();
    if (!earned) {
      await ctx.db.insert("userAchievements", {
        userId,
        badgeId,
        label: challenge.title,
        description: challenge.description.slice(0, 160),
        earnedAt: Date.now(),
      });
    }
    return { ok: true, alreadyCompleted: false, badgeId };
  },
});

/** Admin seed helper for a specific date. */
export const seedChallengeAdmin = mutation({
  args: {
    ...adminCredentialArgs,
    dateKey: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    badgeId: v.string(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!(await isPhase5FlagEnabled(ctx, "phase5.community_growth"))) {
      throw new Error("Enable phase5.community_growth first.");
    }
    const dateKey = args.dateKey ?? utcDateKey();
    const existing = await ctx.db
      .query("betaDailyChallenges")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title.slice(0, 120),
        description: args.description.slice(0, 400),
        badgeId: args.badgeId.slice(0, 64),
        active: true,
      });
      return { id: existing._id, dateKey };
    }
    const id = await ctx.db.insert("betaDailyChallenges", {
      dateKey,
      title: args.title.slice(0, 120),
      description: args.description.slice(0, 400),
      badgeId: args.badgeId.slice(0, 64),
      active: true,
      createdAt: Date.now(),
    });
    return { id, dateKey };
  },
});
