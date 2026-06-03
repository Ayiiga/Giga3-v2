import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { applyStarterGrantIfNeeded } from "./creditsLogic";

async function logStarterGrant(
  ctx: { db: { insert: (table: string, doc: Record<string, unknown>) => Promise<unknown> } },
  args: {
    userId: string;
    amount: number;
    balanceAfter: number;
  }
) {
  await ctx.db.insert("creditLogs", {
    userId: args.userId,
    action: "starter_grant",
    amount: args.amount,
    balanceAfter: args.balanceAfter,
    reference: "onboarding",
    createdAt: Date.now(),
  });
}

export const createUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) {
      await applyStarterGrantIfNeeded(ctx, existing, (entry) =>
        logStarterGrant(ctx, {
          userId: entry.userId,
          amount: entry.amount,
          balanceAfter: entry.balanceAfter,
        })
      );
      return existing;
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      tokens: 12,
      plan: "free",
      tier: "free",
      subscriptionPlan: "free",
      credits: 0,
      starterCreditsGranted: false,
    });

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Failed to create user");

    await applyStarterGrantIfNeeded(ctx, user, (entry) =>
      logStarterGrant(ctx, {
        userId: entry.userId,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
      })
    );

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
