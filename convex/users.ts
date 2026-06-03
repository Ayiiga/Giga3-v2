import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { USER_FIELD_DEFAULTS, userBackfillPatch, withUserDefaults } from "./userDefaults";

export const createUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) {
      const patch = userBackfillPatch(existing);
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
        const updated = await ctx.db.get(existing._id);
        return updated ? withUserDefaults(updated) : withUserDefaults(existing);
      }
      return withUserDefaults(existing);
    }
    const id = await ctx.db.insert("users", {
      email: args.email,
      ...USER_FIELD_DEFAULTS,
    });
    const created = await ctx.db.get(id);
    if (!created) throw new Error("Failed to create user");
    return withUserDefaults(created);
  },
});

/** Public query — used by web (`api.users.getUser`) and legacy frontend HTTP paths. */
export const getUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return null;
    return withUserDefaults(user);
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
