import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, tryRequireSession } from "./auth";
import { sessionArgs } from "./validators";
import { parseInterestProfile } from "./userLearning";
import { todayKey } from "./creditsConfig";

const DAY_MS = 24 * 60 * 60 * 1000;

function newUnsubscribeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function daysSinceDateKey(dateKey: string | undefined, now = Date.now()): number | null {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const then = Date.parse(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(then)) return null;
  return Math.floor((now - then) / DAY_MS);
}

export type EngagementCandidate = {
  email: string;
  name?: string;
  topics: string[];
  inactiveDays: number;
  streakDays: number;
  unsubscribeToken: string;
  role: string;
};

export const getEngagementPrefs = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken);
    if (!email) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;
    return {
      emailEngagementOptIn: user.emailEngagementOptIn !== false,
      lastEngagementEmailAt: user.lastEngagementEmailAt ?? null,
    };
  },
});

export const setEngagementPrefs = mutation({
  args: {
    ...sessionArgs,
    emailEngagementOptIn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error("User not found");
    const token = user.emailUnsubscribeToken || newUnsubscribeToken();
    await ctx.db.patch(user._id, {
      emailEngagementOptIn: args.emailEngagementOptIn,
      emailUnsubscribeToken: token,
    });
    return { ok: true as const };
  },
});

export const listEngagementCandidatesInternal = internalQuery({
  args: {
    limit: v.optional(v.number()),
    minInactiveDays: v.optional(v.number()),
    minDaysSinceLastEmail: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 40, 1), 80);
    const minInactiveDays = args.minInactiveDays ?? 3;
    const minDaysSinceLastEmail = args.minDaysSinceLastEmail ?? 6;
    const now = Date.now();
    const cutoff = now - minDaysSinceLastEmail * DAY_MS;

    const users = await ctx.db.query("users").take(500);
    const candidates: EngagementCandidate[] = [];

    for (const user of users) {
      if (candidates.length >= limit) break;
      if (user.accountStatus === "suspended") continue;
      if (user.emailEngagementOptIn === false) continue;
      if (
        user.lastEngagementEmailAt != null &&
        user.lastEngagementEmailAt > cutoff
      ) {
        continue;
      }

      const inactiveDays =
        daysSinceDateKey(user.lastActiveDateKey, now) ??
        (user.lastActiveDateKey ? 0 : 14);
      if (inactiveDays < minInactiveDays) continue;

      const interests = parseInterestProfile(user.interestProfile);
      const unsubscribeToken = user.emailUnsubscribeToken || newUnsubscribeToken();

      candidates.push({
        email: user.email,
        name: user.name,
        topics: interests.topics.slice(0, 4),
        inactiveDays,
        streakDays: user.learningStreakDays ?? 0,
        unsubscribeToken,
        role: user.userRole ?? "general",
      });
    }

    return candidates;
  },
});

export const ensureUnsubscribeTokenInternal = internalMutation({
  args: {
    email: v.string(),
    unsubscribeToken: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { token: args.unsubscribeToken };
    if (user.emailUnsubscribeToken) {
      return { token: user.emailUnsubscribeToken };
    }
    await ctx.db.patch(user._id, {
      emailUnsubscribeToken: args.unsubscribeToken,
    });
    return { token: args.unsubscribeToken };
  },
});

export const markEngagementEmailSentInternal = internalMutation({
  args: {
    email: v.string(),
    unsubscribeToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { ok: false as const };
    const patch: Record<string, unknown> = {
      lastEngagementEmailAt: Date.now(),
    };
    if (!user.emailUnsubscribeToken && args.unsubscribeToken) {
      patch.emailUnsubscribeToken = args.unsubscribeToken;
    } else if (!user.emailUnsubscribeToken) {
      patch.emailUnsubscribeToken = newUnsubscribeToken();
    }
    await ctx.db.patch(user._id, patch);
    return { ok: true as const };
  },
});

export const unsubscribeByTokenInternal = internalMutation({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const token = args.token.trim();
    if (!email || !token) return { ok: false as const, reason: "invalid" as const };

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { ok: false as const, reason: "not_found" as const };
    if (!user.emailUnsubscribeToken || user.emailUnsubscribeToken !== token) {
      return { ok: false as const, reason: "token_mismatch" as const };
    }

    await ctx.db.patch(user._id, {
      emailEngagementOptIn: false,
    });
    return { ok: true as const };
  },
});

/** Ensure inactive users still have a date key so selection can age them. */
export const touchActiveTodayInternal = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return;
    await ctx.db.patch(user._id, { lastActiveDateKey: todayKey() });
  },
});
