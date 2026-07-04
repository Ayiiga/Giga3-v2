import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  isBlockedFromNewSubscription,
  SUBSCRIPTION_CHECKOUT_BLOCKED_MESSAGE,
} from "./subscriptionPolicy";

async function getUserByEmail(ctx: { db: any }, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
}

export const createVideoJobWithReservation = internalMutation({
  args: {
    userId: v.string(),
    category: v.string(),
    mode: v.string(),
    prompt: v.string(),
    sourceImageUrl: v.optional(v.string()),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByEmail(ctx, args.userId);
    if (!user) throw new Error("User not found");
    const balance = user.videoCredits ?? 0;
    if (balance < args.cost) {
      throw new Error(
        `Insufficient video credits (${args.cost} required, ${balance} available). Buy a Video AI pack at /video/plans.`
      );
    }

    const jobId: Id<"videoJobs"> = await ctx.db.insert("videoJobs", {
      userId: args.userId,
      category: args.category,
      mode: args.mode,
      prompt: args.prompt,
      sourceImageUrl: args.sourceImageUrl,
      status: "processing",
      videoCreditsCharged: args.cost,
      createdAt: Date.now(),
    });

    const balanceAfter = balance - args.cost;
    await ctx.db.patch(user._id, { videoCredits: balanceAfter });
    await ctx.db.insert("videoCreditLogs", {
      userId: args.userId,
      action: "video_generation",
      amount: -args.cost,
      balanceAfter,
      category: args.category,
      reference: String(jobId),
      createdAt: Date.now(),
    });

    return jobId;
  },
});

export const createVideoJob = internalMutation({
  args: {
    userId: v.string(),
    category: v.string(),
    mode: v.string(),
    prompt: v.string(),
    sourceImageUrl: v.optional(v.string()),
    videoCreditsCharged: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("videoJobs", {
      userId: args.userId,
      category: args.category,
      mode: args.mode,
      prompt: args.prompt,
      sourceImageUrl: args.sourceImageUrl,
      status: "processing",
      videoCreditsCharged: args.videoCreditsCharged,
      createdAt: Date.now(),
    });
  },
});

export const completeVideoJob = internalMutation({
  args: {
    jobId: v.id("videoJobs"),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
    outputUrl: v.optional(v.string()),
    provider: v.optional(v.string()),
    externalId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    videoCreditsCharged: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      outputUrl: args.outputUrl,
      provider: args.provider,
      externalId: args.externalId,
      errorMessage: args.errorMessage,
      ...(args.videoCreditsCharged !== undefined
        ? { videoCreditsCharged: args.videoCreditsCharged }
        : {}),
    });
  },
});

export const activateVideoSubscriptionInternal = internalMutation({
  args: {
    userId: v.string(),
    planId: v.string(),
    paystackReference: v.string(),
    paymentId: v.optional(v.id("payments")),
    videoCreditsToGrant: v.number(),
    periodMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) throw new Error("User not found");

    if (isBlockedFromNewSubscription(user.email)) {
      throw new Error(SUBSCRIPTION_CHECKOUT_BLOCKED_MESSAGE);
    }

    const currentEnd = user.videoSubscriptionExpiresAt ?? 0;
    const periodStart = currentEnd > now ? currentEnd : now;
    const periodEnd = periodStart + args.periodMs;

    await ctx.db.patch(user._id, {
      videoSubscriptionPlan: args.planId,
      videoSubscriptionExpiresAt: periodEnd,
    });

    const existing = await ctx.db
      .query("videoSubscriptions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active")
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "expired",
        updatedAt: now,
      });
    }

    await ctx.db.insert("videoSubscriptions", {
      userId: args.userId,
      planId: args.planId,
      status: "active",
      paystackReference: args.paystackReference,
      paymentId: args.paymentId,
      periodStart,
      periodEnd,
      videoCreditsGranted: args.videoCreditsToGrant,
      createdAt: now,
      updatedAt: now,
    });

    return { periodEnd };
  },
});
