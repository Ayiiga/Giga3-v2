import { mutation } from "./_generated/server";
import { v } from "convex/values";

const newPaidUserFields = {
  tier: "free" as const,
  subscriptionPlan: "free" as const,
  credits: 0,
  starterCreditsGranted: false,
};

export const addTokens = mutation({
  args: { email: v.string(), tokens: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, { tokens: (user.tokens ?? 0) + args.tokens });
    await ctx.db.insert("transactions", {
      userId: args.email,
      amount: args.tokens,
      reference: "manual_add",
      tokens: args.tokens,
    });
  },
});

export const grantPurchaseTokens = mutation({
  args: { email: v.string(), tokens: v.number(), reference: v.string() },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        email: args.email,
        tokens: 0,
        plan: "paid",
        ...newPaidUserFields,
      });
      user = { _id: userId, email: args.email, tokens: 0, plan: "paid" };
    }

    const balance = (user.tokens ?? 0) + args.tokens;
    await ctx.db.patch(user._id, { tokens: balance, plan: "paid" });
    await ctx.db.insert("transactions", {
      userId: args.email,
      amount: args.tokens,
      reference: args.reference,
      tokens: args.tokens,
    });
    return balance;
  },
});
