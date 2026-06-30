import { RateLimitError } from "./securityErrors";

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 15;

type DbCtx = { db: any };

/** Sliding-window rate limit for auth bootstrap endpoints. */
export async function consumeAuthRateLimit(
  ctx: DbCtx,
  bucketKey: string
): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: any) => q.eq("bucketKey", bucketKey))
    .first();

  if (!existing || now - existing.windowStartMs > AUTH_WINDOW_MS) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStartMs: now, count: 1 });
    } else {
      await ctx.db.insert("feedbackRateLimits", {
        bucketKey,
        windowStartMs: now,
        count: 1,
      });
    }
    return;
  }

  if (existing.count >= AUTH_MAX_ATTEMPTS) {
    throw new RateLimitError("Too many sign-in attempts. Try again later.");
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}
