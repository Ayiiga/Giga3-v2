import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { userBackfillPatch } from "./userDefaults";

/**
 * Backfill legacy production users missing credits, tier, subscriptionPlan, etc.
 * Idempotent — safe to run after every deploy until all rows are patched.
 */
export const backfillUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let patched = 0;

    for (const user of users) {
      const patch = userBackfillPatch(user);
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(user._id, patch);
        patched += 1;
      }
    }

    return { total: users.length, patched, skipped: users.length - patched };
  },
});

/** Run backfill from CLI: `npx convex run migrations:runUserBackfill` */
export const runUserBackfill = mutation({
  args: {
    adminSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.MIGRATION_ADMIN_SECRET;
    if (expected && args.adminSecret !== expected) {
      throw new Error("Unauthorized");
    }
    return await ctx.runMutation(internal.migrations.backfillUsers, {});
  },
});
