import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { SUBSCRIPTION_PERIOD_MS } from "./subscriptionPlans";
import { paidPlanValidator } from "./schema";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";

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
