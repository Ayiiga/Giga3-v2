import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, tryRequireSession } from "./auth";
import { sessionArgs } from "./validators";
import { parseInterestProfile } from "./userLearning";
import { todayKey } from "./creditsConfig";
import {
  campaignSendingKey,
  campaignUncertainKey,
  evaluateAnnouncementReconcile,
  isCampaignBlockedForRecipient,
  isStaleSendingClaim,
  redactEmail,
  sanitizeOpsReason,
} from "./engagementAnnouncementSafety";

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

/**
 * Announcement candidates: same opt-in / suspension rules as digests, but
 * campaign-key idempotency is separate from digest lastEngagementEmailAt.
 * Optional allowlist restricts to those emails only (server-side).
 */
export const listAnnouncementCandidatesInternal = internalQuery({
  args: {
    limit: v.optional(v.number()),
    minDaysSinceLastEmail: v.optional(v.number()),
    campaignKey: v.string(),
    allowlist: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 40, 1), 80);
    const minDaysSinceLastEmail = args.minDaysSinceLastEmail ?? 10;
    const campaignKey = args.campaignKey.trim();
    const now = Date.now();
    const cutoff = now - minDaysSinceLastEmail * DAY_MS;
    const allowlist =
      args.allowlist && args.allowlist.length > 0
        ? new Set(args.allowlist.map((e) => e.trim().toLowerCase()))
        : null;

    const candidates: EngagementCandidate[] = [];

    if (allowlist) {
      for (const email of allowlist) {
        if (candidates.length >= limit) break;
        const user = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first();
        if (!user) continue;
        if (user.accountStatus === "suspended") continue;
        if (user.emailEngagementOptIn === false) continue;
        if (
          isCampaignBlockedForRecipient(
            user.lastFeatureAnnouncementCampaignKey,
            campaignKey,
            user.lastFeatureAnnouncementAt,
            now
          )
        ) {
          continue;
        }
        if (
          user.lastEngagementEmailAt != null &&
          user.lastEngagementEmailAt > cutoff
        ) {
          continue;
        }
        const interests = parseInterestProfile(user.interestProfile);
        candidates.push({
          email: user.email,
          name: user.name,
          topics: interests.topics.slice(0, 4),
          inactiveDays:
            daysSinceDateKey(user.lastActiveDateKey, now) ??
            (user.lastActiveDateKey ? 0 : 14),
          streakDays: user.learningStreakDays ?? 0,
          unsubscribeToken: user.emailUnsubscribeToken || newUnsubscribeToken(),
          role: user.userRole ?? "general",
        });
      }
      return candidates;
    }

    const users = await ctx.db.query("users").take(500);
    for (const user of users) {
      if (candidates.length >= limit) break;
      if (user.accountStatus === "suspended") continue;
      if (user.emailEngagementOptIn === false) continue;
      if (
        isCampaignBlockedForRecipient(
          user.lastFeatureAnnouncementCampaignKey,
          campaignKey,
          user.lastFeatureAnnouncementAt,
          now
        )
      ) {
        continue;
      }
      if (
        user.lastEngagementEmailAt != null &&
        user.lastEngagementEmailAt > cutoff
      ) {
        continue;
      }

      const interests = parseInterestProfile(user.interestProfile);
      candidates.push({
        email: user.email,
        name: user.name,
        topics: interests.topics.slice(0, 4),
        inactiveDays:
          daysSinceDateKey(user.lastActiveDateKey, now) ??
          (user.lastActiveDateKey ? 0 : 14),
        streakDays: user.learningStreakDays ?? 0,
        unsubscribeToken: user.emailUnsubscribeToken || newUnsubscribeToken(),
        role: user.userRole ?? "general",
      });
    }

    return candidates;
  },
});

/**
 * Claim a recipient before calling Resend so concurrent cron/manual runs
 * cannot double-send the same campaign.
 */
export const claimFeatureAnnouncementSendInternal = internalMutation({
  args: {
    email: v.string(),
    campaignKey: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const campaignKey = args.campaignKey.trim();
    if (!campaignKey) return { ok: false as const, reason: "invalid_campaign" as const };
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { ok: false as const, reason: "not_found" as const };
    if (user.emailEngagementOptIn === false) {
      return { ok: false as const, reason: "opted_out" as const };
    }
    const blocked = isCampaignBlockedForRecipient(
      user.lastFeatureAnnouncementCampaignKey,
      campaignKey,
      user.lastFeatureAnnouncementAt
    );
    if (blocked === "sent") return { ok: false as const, reason: "already_sent_campaign" as const };
    if (blocked === "uncertain") return { ok: false as const, reason: "uncertain_delivery" as const };
    if (blocked === "in_flight") {
      const stale = isStaleSendingClaim(
        user.lastFeatureAnnouncementCampaignKey,
        campaignKey,
        user.lastFeatureAnnouncementAt
      );
      // Stale is observability only — never auto-reclaim for another Resend attempt.
      return { ok: false as const, reason: "in_flight" as const, stale };
    }

    await ctx.db.patch(user._id, {
      lastFeatureAnnouncementCampaignKey: campaignSendingKey(campaignKey),
      lastFeatureAnnouncementAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/**
 * Mark a successful feature announcement. Sets campaign idempotency fields and
 * also bumps lastEngagementEmailAt so digests keep their cross-mail gap.
 */
export const markFeatureAnnouncementSentInternal = internalMutation({
  args: {
    email: v.string(),
    campaignKey: v.string(),
    unsubscribeToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const campaignKey = args.campaignKey.trim();
    if (!campaignKey) return { ok: false as const };
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { ok: false as const };
    const now = Date.now();
    const patch: Record<string, unknown> = {
      lastFeatureAnnouncementAt: now,
      lastFeatureAnnouncementCampaignKey: campaignKey,
      lastEngagementEmailAt: now,
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

/**
 * Record ambiguous delivery (e.g. network error after request). Prevents blind resend.
 * Does not bump lastEngagementEmailAt (digests unaffected).
 */
export const markFeatureAnnouncementUncertainInternal = internalMutation({
  args: {
    email: v.string(),
    campaignKey: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const campaignKey = args.campaignKey.trim();
    if (!campaignKey) return { ok: false as const };
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { ok: false as const };
    await ctx.db.patch(user._id, {
      lastFeatureAnnouncementCampaignKey: campaignUncertainKey(campaignKey),
      lastFeatureAnnouncementAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/** Release an in-flight claim after a definitive provider rejection (safe to retry later). */
export const releaseFeatureAnnouncementClaimInternal = internalMutation({
  args: {
    email: v.string(),
    campaignKey: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const campaignKey = args.campaignKey.trim();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { ok: false as const };
    if (user.lastFeatureAnnouncementCampaignKey !== campaignSendingKey(campaignKey)) {
      return { ok: true as const, released: false as const };
    }
    await ctx.db.patch(user._id, {
      lastFeatureAnnouncementCampaignKey: undefined,
    });
    return { ok: true as const, released: true as const };
  },
});

/**
 * Ops-only reconciliation for stuck `sending:` / `uncertain:` announcement claims.
 * Internal mutation only (deploy-key / dashboard) — never a public client mutation.
 * Does not send email. Never auto-invoked from the send path or cron.
 *
 * Audit: structured console log with redacted email (no durable audit table in-repo).
 */
export const reconcileFeatureAnnouncementDeliveryInternal = internalMutation({
  args: {
    email: v.string(),
    campaignKey: v.string(),
    decision: v.union(v.literal("confirm_sent"), v.literal("release_for_retry")),
    /** Short operational reason (required; sanitized; never log secrets). */
    opsReason: v.string(),
    /**
     * Required for release_for_retry — affirmative provider evidence of non-delivery.
     * Ambiguous cases must stay suppressed (do not call release).
     */
    nonDeliveryEvidence: v.optional(
      v.union(
        v.literal("provider_confirmed_not_accepted"),
        v.literal("provider_confirmed_failed")
      )
    ),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const campaignKey = args.campaignKey.trim();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      console.error(
        `[featureEmail.reconcile] rejected reason=not_found campaign=${campaignKey} decision=${args.decision}`
      );
      return { ok: false as const, reason: "not_found" as const };
    }
    if (user.emailEngagementOptIn === false) {
      console.error(
        `[featureEmail.reconcile] rejected reason=opted_out campaign=${campaignKey} to=${redactEmail(email)}`
      );
      return { ok: false as const, reason: "opted_out" as const };
    }

    const expectedKey = user.lastFeatureAnnouncementCampaignKey;
    const evaluated = evaluateAnnouncementReconcile({
      email,
      campaignKey,
      decision: args.decision,
      opsReason: args.opsReason,
      nonDeliveryEvidence: args.nonDeliveryEvidence,
      storedKey: expectedKey,
    });
    if (!evaluated.ok) {
      console.error(
        `[featureEmail.reconcile] rejected reason=${evaluated.reason} campaign=${campaignKey} decision=${args.decision} to=${redactEmail(email)}`
      );
      return { ok: false as const, reason: evaluated.reason };
    }

    // Compare-and-swap: refuse if claim key changed inside this transaction snapshot
    // (Convex OCC retries the whole mutation on concurrent writes to the same doc).
    const fresh = await ctx.db.get(user._id);
    if (!fresh || fresh.lastFeatureAnnouncementCampaignKey !== expectedKey) {
      console.error(
        `[featureEmail.reconcile] rejected reason=not_reconcilable campaign=${campaignKey} decision=${args.decision} to=${redactEmail(email)} detail=claim_changed`
      );
      return { ok: false as const, reason: "not_reconcilable" as const };
    }

    const now = Date.now();
    const opsReason = sanitizeOpsReason(evaluated.opsReason);

    if (evaluated.decision === "confirm_sent") {
      const patch: Record<string, unknown> = {
        lastFeatureAnnouncementCampaignKey: campaignKey,
        lastFeatureAnnouncementAt: now,
        lastEngagementEmailAt: now,
      };
      await ctx.db.patch(fresh._id, patch);
      console.info(
        `[featureEmail.reconcile] ok decision=confirm_sent campaign=${campaignKey} to=${redactEmail(email)} reason=${opsReason}`
      );
      return {
        ok: true as const,
        decision: "confirm_sent" as const,
        emailRedacted: redactEmail(email),
        campaignKey,
      };
    }

    // release_for_retry — evidence already validated; clear claim only (no email send).
    await ctx.db.patch(fresh._id, {
      lastFeatureAnnouncementCampaignKey: undefined,
    });
    console.info(
      `[featureEmail.reconcile] ok decision=release_for_retry campaign=${campaignKey} to=${redactEmail(email)} evidence=${args.nonDeliveryEvidence} reason=${opsReason}`
    );
    return {
      ok: true as const,
      decision: "release_for_retry" as const,
      emailRedacted: redactEmail(email),
      campaignKey,
    };
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
