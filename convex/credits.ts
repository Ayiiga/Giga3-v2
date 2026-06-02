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

type DbCtx = { db: any };

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
    balanceAfter: args.balanceAfter,
    reference: args.reference,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

async function performDeduct(
  ctx: DbCtx,
  userId: string,
  action: CreditAction,
  reference?: string,
  metadata?: string
) {
  await ctx.runMutation(internal.subscriptions.expireStaleSubscriptions, {});

  const user = await getUserByEmail(ctx, userId);
  if (!user) throw new Error("User not found");

  const cost = CREDIT_COSTS[action];
  const balance = user.credits ?? 0;
  if (balance < cost) {
    throw new Error(
      `Insufficient credits (${cost} required, ${balance} available). Subscribe or renew to refill.`
    );
  }

  const balanceAfter = balance - cost;
  await ctx.db.patch(user._id, { credits: balanceAfter });
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

    const balanceAfter = args.setBalance
      ? args.credits
      : (user.credits ?? 0) + args.credits;

    await ctx.db.patch(user._id, { credits: balanceAfter });
    await logCredit(ctx, {
      userId: args.userId,
      action: args.action,
      amount: args.setBalance
        ? args.credits - (user.credits ?? 0)
        : args.credits,
      balanceAfter,
      reference: args.reference,
      metadata: args.metadata,
    });

    return balanceAfter;
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

    return {
      subscriptionPlan: active ? plan : "free",
      subscriptionActive: active,
      credits: user.credits ?? 0,
      tokens: user.tokens ?? 0,
      subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
      planLabel: subscription?.planId ?? plan,
      canGenerateVideo: (user.credits ?? 0) >= CREDIT_COSTS.video,
      creditCosts: CREDIT_COSTS,
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
