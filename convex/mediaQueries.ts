import { query } from "./_generated/server";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";

/** Media job history (must not live in a `"use node"` module). */
export const listJobs = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const rows = await ctx.db
      .query("mediaJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    return rows;
  },
});
