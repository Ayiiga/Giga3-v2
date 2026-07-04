import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { SUBSCRIPTION_PERIOD_MS } from "./subscriptionPlans";
import { paidPlanValidator } from "./schema";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import {
  GRANDFATHERED_SUBSCRIBER_EMAIL,
  isBlockedFromNewSubscription,
  isGrandfatheredSubscriber,
  normalizeSubscriberEmail,
  SUBSCRIPTION_CHECKOUT_BLOCKED_MESSAGE,
} from "./subscriptionPolicy";

export const getActiveSubscription = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .first();
  },
});

export const activateSubscription = internalMutation({
  args: {
    userId: v.string(),
    planId: paidPlanValidator,
    paystackReference: v.string(),
    paymentId: v.id("payments"),
    creditsToGrant: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) throw new Error("User not found");

    if (isBlockedFromNewSubscription(user.email)) {
      throw new Error(SUBSCRIPTION_CHECKOUT_BLOCKED_MESSAGE);
    }

    const now = Date.now();
    const base = Math.max(user.subscriptionExpiresAt ?? now, now);
    const periodStart =
      user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
        ? user.subscriptionExpiresAt
        : now;
    const periodEnd = base + SUBSCRIPTION_PERIOD_MS;

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
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(user._id, {
      subscriptionPlan: args.planId,
      plan: args.planId,
      tier: "premium",
      subscriptionExpiresAt: periodEnd,
    });

    return { subscriptionId: subId, periodEnd };
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

export const runExpiryCheck = mutation({
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
