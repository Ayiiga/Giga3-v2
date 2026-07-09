import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { userRoleValidator } from "./schema";
import { todayKey } from "./creditsConfig";

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function generateReferralCode(email: string): string {
  const base = email.split("@")[0]?.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "GIGA";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

export const getPlatformProfile = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;

    return {
      userRole: user.userRole ?? "general",
      onboardingState: parseJson(user.onboardingState, {
        completed: Boolean(user.onboardingCompletedAt),
        role: user.userRole ?? "general",
        stepsSeen: [],
        dismissedTips: [],
      }),
      userPreferences: parseJson(user.userPreferences, null),
      referralCode: user.referralCode ?? null,
      learningStreakDays: user.learningStreakDays ?? 0,
      onboardingCompletedAt: user.onboardingCompletedAt ?? null,
    };
  },
});

export const saveOnboarding = mutation({
  args: {
    ...sessionArgs,
    role: userRoleValidator,
    stepsSeen: v.array(v.string()),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error("User not found");

    const now = Date.now();
    const onboardingState = JSON.stringify({
      completed: args.completed,
      completedAt: args.completed ? now : undefined,
      role: args.role,
      stepsSeen: args.stepsSeen,
      dismissedTips: [],
    });

    const patch: Record<string, unknown> = {
      userRole: args.role,
      onboardingState,
    };
    if (args.completed) {
      patch.onboardingCompletedAt = now;
    }
    if (!user.referralCode) {
      patch.referralCode = generateReferralCode(email);
    }

    await ctx.db.patch(user._id, patch);
    return { ok: true };
  },
});

export const saveUserPreferences = mutation({
  args: {
    ...sessionArgs,
    preferencesJson: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error("User not found");

    JSON.parse(args.preferencesJson);
    await ctx.db.patch(user._id, { userPreferences: args.preferencesJson });
    return { ok: true };
  },
});

export const recordDailyActivity = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { streak: 0 };

    const today = todayKey();
    const last = user.lastActiveDateKey;
    let streak = user.learningStreakDays ?? 0;

    if (last === today) {
      return { streak };
    }

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (last === yesterday) {
      streak += 1;
    } else if (last !== today) {
      streak = 1;
    }

    await ctx.db.patch(user._id, {
      learningStreakDays: streak,
      lastActiveDateKey: today,
    });
    return { streak };
  },
});
