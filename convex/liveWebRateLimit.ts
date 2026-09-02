import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { RateLimitError } from "../securityErrors";
import { liveWebRateLimitPerHour } from "./liveWeb/liveWebConfig";

const WINDOW_MS = 60 * 60 * 1000;

function bucketKey(userId: string): string {
  return `liveweb:${userId}`;
}

export const consumeLiveWebRateLimitInternal = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const max = liveWebRateLimitPerHour();
    const now = Date.now();
    const key = bucketKey(args.userId);
    const existing = await ctx.db
      .query("feedbackRateLimits")
      .withIndex("by_bucket", (q) => q.eq("bucketKey", key))
      .first();

    if (!existing || now - existing.windowStartMs > WINDOW_MS) {
      if (existing) {
        await ctx.db.patch(existing._id, { windowStartMs: now, count: 1 });
      } else {
        await ctx.db.insert("feedbackRateLimits", {
          bucketKey: key,
          windowStartMs: now,
          count: 1,
        });
      }
      return;
    }

    if (existing.count >= max) {
      throw new RateLimitError(
        "Live web research limit reached. Please wait before searching again."
      );
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  },
});
