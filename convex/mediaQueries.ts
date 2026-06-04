import { query } from "./_generated/server";
import { v } from "convex/values";

/** Media job history (must not live in a `"use node"` module). */
export const listJobs = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("mediaJobs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
    return rows;
  },
});
