import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";

export const listJobs = query({
  args: { ...sessionArgs, limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const cap = args.limit ?? 30;
    return await ctx.db
      .query("videoJobs")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .order("desc")
      .take(cap);
  },
});

export const getCatalog = query({
  args: {},
  handler: async () => {
    const { listVideoCatalog } = await import("./videoPlans");
    const { VIDEO_AI_CATEGORIES } = await import("./videoCatalog");
    const { VIDEO_AI_COSTS } = await import("./videoCreditsConfig");
    return {
      categories: VIDEO_AI_CATEGORIES,
      costs: VIDEO_AI_COSTS,
      plans: listVideoCatalog(),
    };
  },
});
