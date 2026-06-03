import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { creditActionValidator } from "./schema";
import {
  CREDIT_COSTS,
  creditActionForMode,
  isSubscriptionActive,
  type CreditAction,
} from "./creditsConfig";
import {
  applyStarterGrantIfNeeded,
  isCreditsBypassEnabled,
  normalizeCredits,
} from "./creditsLogic";
import type { SubscriptionPlanId } from "./subscriptionPlans";

type DbCtx = { db: any; runMutation?: (ref: any, args: any) => Promise<any> };

async function getUserByEmail(ctx: DbCtx, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
}

async function logCredit(
  ctx: DbCtx,
  args: {
    userId: string;
    action:
      | CreditAction
      | "subscription_refill"
      | "credit_purchase"
      | "starter_grant"
      | "admin_grant";
    amount: number;
    balanceAfter: number;
    reference?: string;
    metadata?: string;
  }
) {
  await ctx.db.insert("creditLogs", {
    userId: args.userId,
    action: args.action,
    amount: args.amount,
    balanceAfter: normalizeCredits(args.balanceAfter),
    reference: args.reference,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

async function ensureStarterCreditsForUser(ctx: DbCtx, email: string) {
  const user = await getUserByEmail(ctx, email);
  if (!user) throw new Error("User not found");
  return await applyStarterGrantIfNeeded(ctx, user, (entry) =>
    logCredit(ctx, entry)
  );
}

async function performDeduct(
  ctx: DbCtx,
  userId: string,
  action: CreditAction,
  reference?: string,
  metadata?: string
) {
  if (ctx.runMutation) {
    await ctx.runMutation(internal.subscriptions.expireStaleSubscriptions, {});
  }

  const user = await getUserByEmail(ctx, userId);
  if (!user) throw new Error("User not found");

  await applyStarterGrantIfNeeded(ctx, user, (entry) => logCredit(ctx, entry));

  const refreshed = await getUserByEmail(ctx, userId);
  if (!refreshed) throw new Error("User not found");

  const balance = normalizeCredits(refreshed.credits);

  if (isCreditsBypassEnabled()) {
    return { balanceAfter: balance, charged: 0, bypassed: true as const };
  }

  const cost = CREDIT_COSTS[action];
  if (balance < cost) {
    throw new Error(
      `Insufficient credits (${cost} required, ${balance} available). Subscribe or renew to refill.`
    );
  }

  const balanceAfter = normalizeCredits(balance - cost);
  await ctx.db.patch(refreshed._id, { credits: balanceAfter });
  await logCredit(ctx, {
    userId,
    action,
    amount: -cost,
    balanceAfter,
    reference,
    metadata,
  });

  return { balanceAfter, charged: cost };
}

export const grantCreditsInternal = internalMutation({
  args: {
    userId: v.string(),
    credits: v.number(),
    action: creditActionValidator,
    reference: v.optional(v.string()),
    metadata: v.optional(v.string()),
    setBalance: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByEmail(ctx, args.userId);
    if (!user) throw new Error("User not found");

    const balanceAfter = normalizeCredits(
      args.setBalance
        ? args.credits
        : normalizeCredits(user.credits) + args.credits
    );

    await ctx.db.patch(user._id, { credits: balanceAfter });
    await logCredit(ctx, {
      userId: args.userId,
      action: args.action,
      amount: args.setBalance
        ? balanceAfter - normalizeCredits(user.credits)
        : args.credits,
      balanceAfter,
      reference: args.reference,
      metadata: args.metadata,
    });

    return balanceAfter;
  },
});

/** Idempotent one-time starter grant — safe to call on login and before chat. */
export const ensureStarterCredits = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const balanceAfter = await ensureStarterCreditsForUser(ctx, args.userId);
    return { balanceAfter, starterCreditsGranted: true as const };
  },
});

/** Backfill existing users who never received onboarding credits. */
export const backfillStarterCredits = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cap = args.limit ?? 500;
    const users = await ctx.db.query("users").take(cap);
    let granted = 0;
    let flagsFixed = 0;
    let normalized = 0;

    for (const user of users) {
      const before = normalizeCredits(user.credits);
      if (before !== user.credits) {
        await ctx.db.patch(user._id, { credits: before });
        normalized += 1;
      }

      if (user.starterCreditsGranted) continue;

      const current = normalizeCredits(user.credits);
      if (current > 0) {
        await ctx.db.patch(user._id, { starterCreditsGranted: true });
        flagsFixed += 1;
        continue;
      }

      await applyStarterGrantIfNeeded(ctx, user, (entry) =>
        logCredit(ctx, entry)
      );
      granted += 1;
    }

    return { scanned: users.length, granted, flagsFixed, normalized };
  },
});

export const deductCredits = mutation({
  args: {
    userId: v.string(),
    action: creditActionValidator,
    reference: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await performDeduct(
      ctx,
      args.userId,
      args.action as CreditAction,
      args.reference,
      args.metadata
    );
  },
});

export const deductForChatMode = mutation({
  args: {
    userId: v.string(),
    mode: v.string(),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const action = creditActionForMode(args.mode);
    return await performDeduct(
      ctx,
      args.userId,
      action,
      args.reference,
      JSON.stringify({ mode: args.mode })
    );
  },
});

export const getUsageSnapshot = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserByEmail(ctx, args.userId);
    if (!user) return null;

    const plan = (user.subscriptionPlan ?? "free") as SubscriptionPlanId;
    const active = isSubscriptionActive(plan, user.subscriptionExpiresAt);

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active")
      )
      .first();

    const credits = normalizeCredits(user.credits);

    return {
      subscriptionPlan: active ? plan : "free",
      subscriptionActive: active,
      credits,
      tokens: user.tokens ?? 0,
      subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
      planLabel: subscription?.planId ?? plan,
      starterCreditsGranted: user.starterCreditsGranted ?? false,
      canGenerateVideo: credits >= CREDIT_COSTS.video,
      creditCosts: CREDIT_COSTS,
      creditsBypassDev: isCreditsBypassEnabled(),
    };
  },
});

export const listCreditLogs = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cap = args.limit ?? 50;
    const rows = await ctx.db
      .query("creditLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(cap);
    return rows;
  },
});

/** @deprecated use deductCredits — kept for media module compatibility */
export const assertCanGenerateImage = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const result = await performDeduct(ctx, args.userId, "image");
    return { chargedCredits: result.charged };
  },
});

/** @deprecated use deductCredits */
export const assertCanGenerateVideo = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const result = await performDeduct(ctx, args.userId, "video");
    return { chargedCredits: result.charged };
  },
});

/** @deprecated use deductForChatMode */
export const assertCanChat = mutation({
  args: { userId: v.string(), mode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const action = creditActionForMode(args.mode ?? "general");
    await performDeduct(ctx, args.userId, action);
    return { allowed: true as const };
  },
});

export const grantCredits = mutation({
  args: {
    userId: v.string(),
    credits: v.number(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.credits.grantCreditsInternal, {
      userId: args.userId,
      credits: args.credits,
      action: "admin_grant",
      reference: args.reference,
    });
  },
});
