import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { FREE_STARTER_CREDITS } from "./subscriptionPlans";

export const createUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) {
      return existing;
    }

    await ctx.db.insert("users", {
      email: args.email,
      tokens: 12,
      plan: "free",
      tier: "free",
      subscriptionPlan: "free",
      credits: 0,
      starterCreditsGranted: false,
    });

    await ctx.runMutation(internal.credits.grantCreditsInternal, {
      userId: args.email,
      credits: FREE_STARTER_CREDITS,
      action: "starter_grant",
      reference: "signup",
      setBalance: true,
    });

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (user && !user.starterCreditsGranted) {
      await ctx.db.patch(user._id, { starterCreditsGranted: true });
    }

    return user;
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
