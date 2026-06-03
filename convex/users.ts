import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    if (existing) {
      return existing;
    }
    return await ctx.db.insert("users", {
      email: args.email,
      tokens: 12,
      plan: "free",
    });
  },
});

export const getUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

export const deductTokens = mutation({
  args: { email: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    if (!user) {
      throw new Error("User not found");
    }
    const tokens = Math.max(0, (user.tokens ?? 0) - args.amount);
    await ctx.db.patch(user._id, { tokens });
    return tokens;
  },
});