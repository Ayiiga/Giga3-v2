import { RateLimitError } from "./securityErrors";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 120;

/** Sliding-window rate limit for GigaSocial developer HTTP API keys. */
export const consumeDeveloperApiRateLimitMutation = internalMutation({
  args: { apiKeyId: v.string() },
  handler: async (ctx, args) => {
    const bucketKey = `gigasocial-api:${args.apiKeyId}`;
    const now = Date.now();
    const existing = await ctx.db
      .query("feedbackRateLimits")
      .withIndex("by_bucket", (q) => q.eq("bucketKey", bucketKey))
      .first();

    if (!existing || now - existing.windowStartMs > WINDOW_MS) {
      if (existing) {
        await ctx.db.patch(existing._id, { windowStartMs: now, count: 1 });
      } else {
        await ctx.db.insert("feedbackRateLimits", {
          bucketKey,
          windowStartMs: now,
          count: 1,
        });
      }
      return { ok: true as const };
    }

    if (existing.count >= MAX_REQUESTS_PER_HOUR) {
      throw new RateLimitError(
        "Developer API rate limit exceeded. Try again in an hour or contact support."
      );
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { ok: true as const };
  },
});
