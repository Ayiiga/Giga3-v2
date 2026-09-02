import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getPlanMonthlyCredits, SUBSCRIPTION_PERIOD_MS } from "./subscriptionPlans";
import { paidPlanValidator } from "./schema";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import {
  GRANDFATHERED_SUBSCRIBER_EMAIL,
  isGrandfatheredSubscriber,
  normalizeSubscriberEmail,
} from "./subscriptionPolicy";
import { describePaymentMethod } from "./subscriptionRenewalLogic";

const subscriptionSourceValidator = v.union(
  v.literal("checkout"),
  v.literal("renewal"),
  v.literal("complimentary")
);

export const getActiveSubscription = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .first();
  },
});

/** Client-safe renewal settings: auto-renew flag + masked saved method (never the auth code). */
export const getRenewalSettings = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userId))
      .first();
    if (!user) return null;

    const method = await ctx.db
      .query("billingAuthorizations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    const active = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .first();

    return {
      autoRenew: user.autoRenew !== false,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
      source: active?.source ?? null,
      savedMethod: method
        ? {
            label: describePaymentMethod(method),
            channel: method.channel,
            reusable: method.reusable,
            expMonth: method.expMonth ?? null,
            expYear: method.expYear ?? null,
          }
        : null,
      renewalFailures: user.renewalFailures ?? 0,
    };
  },
});

/** Turn automatic renewal on/off. Off = plan lapses at period end (no charge). */
export const setAutoRenew = mutation({
  args: { ...sessionArgs, enabled: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userId))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      autoRenew: args.enabled,
      ...(args.enabled ? { renewalFailures: 0 } : {}),
    });
    return { autoRenew: args.enabled };
  },
});

/** Forget the saved card and stop automatic renewal. */
export const removeSavedPaymentMethod = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const methods = await ctx.db
      .query("billingAuthorizations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const method of methods) {
      await ctx.db.delete(method._id);
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userId))
      .first();
    if (user) await ctx.db.patch(user._id, { autoRenew: false });
    return { removed: methods.length };
  },
});

export const activateSubscription = internalMutation({
  args: {
    userId: v.string(),
    planId: paidPlanValidator,
    paystackReference: v.string(),
    paymentId: v.optional(v.id("payments")),
    creditsToGrant: v.number(),
    source: v.optional(subscriptionSourceValidator),
    /** Override the 30-day period (complimentary grants). */
    periodMs: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) throw new Error("User not found");

    const now = Date.now();
    const base = Math.max(user.subscriptionExpiresAt ?? now, now);
    const periodStart =
      user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
        ? user.subscriptionExpiresAt
        : now;
    const periodEnd = base + (args.periodMs ?? SUBSCRIPTION_PERIOD_MS);

    const existingActive = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active")
      )
      .collect();

    for (const sub of existingActive) {
      await ctx.db.patch(sub._id, {
        status: "expired",
        updatedAt: now,
      });
    }

    const subId = await ctx.db.insert("subscriptions", {
      userId: args.userId,
      planId: args.planId,
      status: "active",
      paystackReference: args.paystackReference,
      paymentId: args.paymentId,
      periodStart,
      periodEnd,
      creditsGranted: args.creditsToGrant,
      source: args.source ?? "checkout",
      note: args.note,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(user._id, {
      subscriptionPlan: args.planId,
      plan: args.planId,
      tier: "premium",
      subscriptionExpiresAt: periodEnd,
      // A successful paid period resets the failure counter; keep an explicit opt-out.
      renewalFailures: 0,
      ...(user.autoRenew === undefined && args.source !== "complimentary"
        ? { autoRenew: true }
        : {}),
    });

    return { subscriptionId: subId, periodEnd };
  },
});

/**
 * Grant a plan without a Paystack charge (owner/admin use via `npx convex run`).
 * Credits = monthly allotment × months, granted up front.
 */
export const grantComplimentarySubscription = internalMutation({
  args: {
    email: v.string(),
    planId: paidPlanValidator,
    months: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normalizeSubscriberEmail(args.email);
    const months = Math.max(1, Math.floor(args.months));
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error(`User not found: ${email}`);

    const monthlyCredits = getPlanMonthlyCredits(args.planId);
    const totalCredits = monthlyCredits * months;
    const reference = `giga3_comp_${args.planId}_${Date.now()}`;

    const result = await ctx.runMutation(internal.subscriptions.activateSubscription, {
      userId: email,
      planId: args.planId,
      paystackReference: reference,
      creditsToGrant: totalCredits,
      source: "complimentary",
      periodMs: months * SUBSCRIPTION_PERIOD_MS,
      note: args.note ?? `Complimentary ${args.planId} for ${months} month(s)`,
    });

    // Complimentary periods must never trigger a card charge at period end.
    await ctx.db.patch(user._id, { autoRenew: false });

    const balance = await ctx.runMutation(internal.credits.grantCreditsInternal, {
      userId: email,
      credits: totalCredits,
      action: "admin_grant",
      reference,
      metadata: JSON.stringify({ planId: args.planId, months, note: args.note }),
      setBalance: true,
    });

    return {
      email,
      planId: args.planId,
      months,
      creditsGranted: totalCredits,
      balanceAfter: balance,
      periodEnd: result.periodEnd,
      reference,
    };
  },
});

export const expireStaleSubscriptions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db.query("users").collect();
    let downgraded = 0;

    for (const user of users) {
      if (user.subscriptionPlan === "free") continue;
      if (user.subscriptionExpiresAt && user.subscriptionExpiresAt > now) {
        continue;
      }

      const activeSubs = await ctx.db
        .query("subscriptions")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user.email).eq("status", "active")
        )
        .collect();

      for (const sub of activeSubs) {
        await ctx.db.patch(sub._id, { status: "expired", updatedAt: now });
      }

      await ctx.db.patch(user._id, {
        subscriptionPlan: "free",
        plan: "free",
        tier: "free",
      });
      downgraded += 1;
    }

    return { downgraded };
  },
});

/** Ops-only manual trigger (`npx convex run`); the daily cron covers production. */
export const runExpiryCheck = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.runMutation(
      internal.subscriptions.expireStaleSubscriptions,
      {}
    );
  },
});

/** Revoke all active chat/video subscriptions except the grandfathered account. */
export const revokeLegacySubscribersExceptGrandfathered = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db.query("users").collect();
    let revokedChat = 0;
    let revokedVideo = 0;
    let preserved = false;

    for (const user of users) {
      const email = normalizeSubscriberEmail(user.email);
      if (isGrandfatheredSubscriber(email)) {
        preserved = true;
        continue;
      }

      const activeChatSubs = await ctx.db
        .query("subscriptions")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user.email).eq("status", "active")
        )
        .collect();

      const hasPaidChat =
        user.subscriptionPlan !== "free" || activeChatSubs.length > 0;

      if (hasPaidChat) {
        for (const sub of activeChatSubs) {
          await ctx.db.patch(sub._id, { status: "cancelled", updatedAt: now });
        }
        await ctx.db.patch(user._id, {
          subscriptionPlan: "free",
          plan: "free",
          tier: "free",
          subscriptionExpiresAt: undefined,
        });
        revokedChat += 1;
      }

      const activeVideoSubs = await ctx.db
        .query("videoSubscriptions")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user.email).eq("status", "active")
        )
        .collect();

      const hasPaidVideo =
        Boolean(user.videoSubscriptionPlan) || activeVideoSubs.length > 0;

      if (hasPaidVideo) {
        for (const sub of activeVideoSubs) {
          await ctx.db.patch(sub._id, { status: "cancelled", updatedAt: now });
        }
        await ctx.db.patch(user._id, {
          videoSubscriptionPlan: undefined,
          videoSubscriptionExpiresAt: undefined,
        });
        revokedVideo += 1;
      }
    }

    return {
      revokedChat,
      revokedVideo,
      preservedGrandfathered: preserved,
      grandfatheredEmail: GRANDFATHERED_SUBSCRIBER_EMAIL,
    };
  },
});
