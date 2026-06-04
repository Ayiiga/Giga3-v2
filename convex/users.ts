import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  parseInterestProfile,
  serializeInterestProfile,
  updateInterestProfile,
} from "./userLearning";
import { isValidMode } from "./aiModes";
import { grantStarterCreditsIfNeeded } from "./userStarterCredits";

export const createUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      return await grantStarterCreditsIfNeeded(ctx, email, existing);
    }

    const userId = await ctx.db.insert("users", {
      email,
      tokens: 12,
      plan: "free",
      tier: "free",
      subscriptionPlan: "free",
      credits: 0,
      starterCreditsGranted: false,
    });
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Failed to create user");
    }
    return await grantStarterCreditsIfNeeded(ctx, email, user);
  },
});

/** One-time backfill for users created without starter credits (e.g. legacy paths). */
export const backfillMissingStarterCredits = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? 100, 500);
    const users = await ctx.db.query("users").take(cap * 3);
    let patched = 0;
    for (const user of users) {
      if (patched >= cap) break;
      if (user.starterCreditsGranted) continue;
      await grantStarterCreditsIfNeeded(ctx, user.email, user);
      patched += 1;
    }
    return { patched };
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
