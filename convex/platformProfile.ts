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
    try {
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
    } catch (error) {
      console.error("getPlatformProfile failed:", error);
      return null;
    }
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
    const existing = parseJson(user.onboardingState, {
      completed: Boolean(user.onboardingCompletedAt),
      role: user.userRole ?? "general",
      stepsSeen: [] as string[],
      dismissedTips: [] as string[],
    });
    const onboardingState = JSON.stringify({
      ...existing,
      completed: args.completed,
      completedAt: args.completed ? now : existing.completedAt,
      role: args.role,
      stepsSeen: args.stepsSeen,
      dismissedTips: existing.dismissedTips ?? [],
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

/**
 * Merge additive engagement fields into onboardingState JSON without wiping
 * chat OnboardingWizard progress.
 */
export const patchEngagementOnboarding = mutation({
  args: {
    ...sessionArgs,
    welcomeDismissed: v.optional(v.boolean()),
    welcomeCompleted: v.optional(v.boolean()),
    interests: v.optional(v.array(v.string())),
    checklistItemId: v.optional(v.string()),
    checklistDismissed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error("User not found");

    const now = Date.now();
    const existing = parseJson(user.onboardingState, {
      completed: Boolean(user.onboardingCompletedAt),
      role: user.userRole ?? "general",
      stepsSeen: [] as string[],
      dismissedTips: [] as string[],
      interests: [] as string[],
      checklistCompleted: {} as Record<string, number>,
    });

    const next: Record<string, unknown> = { ...existing };
    if (args.welcomeDismissed) next.welcomeDismissedAt = now;
    if (args.welcomeCompleted) {
      next.welcomeCompletedAt = now;
      next.welcomeDismissedAt = existing.welcomeDismissedAt ?? now;
    }
    if (args.interests) {
      next.interests = args.interests
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 16);
    }
    if (args.checklistItemId?.trim()) {
      const map = {
        ...(typeof existing.checklistCompleted === "object" &&
        existing.checklistCompleted
          ? existing.checklistCompleted
          : {}),
      } as Record<string, number>;
      map[args.checklistItemId.trim()] = now;
      next.checklistCompleted = map;
    }
    if (args.checklistDismissed) next.checklistDismissedAt = now;

    await ctx.db.patch(user._id, {
      onboardingState: JSON.stringify(next),
    });
    return { ok: true as const };
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
    return { ok: true as const };
  },
});

export const updateUserRole = mutation({
  args: {
    ...sessionArgs,
    role: userRoleValidator,
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error("User not found");

    const existing = parseJson(user.onboardingState, {
      completed: Boolean(user.onboardingCompletedAt),
      role: user.userRole ?? "general",
      stepsSeen: [],
      dismissedTips: [],
    });

    await ctx.db.patch(user._id, {
      userRole: args.role,
      onboardingState: JSON.stringify({ ...existing, role: args.role }),
    });
    return { ok: true as const };
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
