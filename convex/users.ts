import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  parseInterestProfile,
  serializeInterestProfile,
  updateInterestProfile,
} from "./userLearning";
import { isValidMode } from "./aiModes";
import { FREE_STARTER_CREDITS } from "./subscriptionPlans";

export const createUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      if (existing.starterCreditsGranted !== true) {
        const balanceAfter = (existing.credits ?? 0) + FREE_STARTER_CREDITS;
        await ctx.db.patch(existing._id, {
          credits: balanceAfter,
          starterCreditsGranted: true,
        });
        await ctx.db.insert("creditLogs", {
          userId: args.email,
          action: "starter_grant",
          amount: FREE_STARTER_CREDITS,
          balanceAfter,
          reference: "free_starter",
          metadata: JSON.stringify({ reason: "login_backfill" }),
          createdAt: Date.now(),
        });
        return await ctx.db.get(existing._id);
      }
      return existing;
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      tokens: 12,
      plan: "free",
      tier: "free",
      subscriptionPlan: "free",
      credits: FREE_STARTER_CREDITS,
      starterCreditsGranted: true,
    });

    await ctx.db.insert("creditLogs", {
      userId: args.email,
      action: "starter_grant",
      amount: FREE_STARTER_CREDITS,
      balanceAfter: FREE_STARTER_CREDITS,
      reference: "free_starter",
      metadata: JSON.stringify({ reason: "signup" }),
      createdAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});

export const getUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/** Updates interest profile from each chat message (consistent users get better personalization). */
export const recordChatInteraction = mutation({
  args: {
    email: v.string(),
    mode: v.string(),
    messageContent: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return null;

    const safeMode = isValidMode(args.mode) ? args.mode : "general";
    const current = parseInterestProfile(user.interestProfile);
    const next = updateInterestProfile(current, safeMode, args.messageContent);
    await ctx.db.patch(user._id, {
      interestProfile: serializeInterestProfile(next),
    });
    return next.messageCount;
  },
});

export const deductTokens = mutation({
  args: { email: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) {
      throw new Error("User not found");
    }
    const tokens = Math.max(0, (user.tokens ?? 0) - args.amount);
    await ctx.db.patch(user._id, { tokens });
    return tokens;
  },
});
