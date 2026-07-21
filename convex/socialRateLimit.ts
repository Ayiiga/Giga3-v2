/**
 * Sliding-window rate limits for GigaSocial write mutations.
 * Reuses feedbackRateLimits table — no schema change.
 * Kill-switch: GIGA3_SOCIAL_WRITE_RATE_LIMIT=false
 */

import { RateLimitError } from "./securityErrors";

const WINDOW_MS = 10 * 60 * 1000;

type LimitConfig = { max: number; label: string };

const LIMITS: Record<string, LimitConfig> = {
  create_post: { max: 30, label: "posts" },
  add_comment: { max: 60, label: "comments" },
  toggle_like: { max: 120, label: "likes" },
};

type DbCtx = { db: any };

export function isSocialWriteRateLimitEnabled(): boolean {
  const raw = process.env.GIGA3_SOCIAL_WRITE_RATE_LIMIT;
  if (raw === undefined || raw === "") return true;
  return raw !== "false" && raw !== "0";
}

export async function consumeSocialWriteRateLimit(
  ctx: DbCtx,
  userId: string,
  action: keyof typeof LIMITS
): Promise<void> {
  if (!isSocialWriteRateLimitEnabled()) return;

  const config = LIMITS[action];
  if (!config) return;

  const bucketKey = `social:${action}:${userId.trim().toLowerCase()}`;
  const now = Date.now();
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: any) => q.eq("bucketKey", bucketKey))
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
    return;
  }

  if (existing.count >= config.max) {
    throw new RateLimitError(
      `Too many ${config.label}. Please wait a few minutes and try again.`
    );
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

/** Pure helper for unit tests. */
export function socialWriteLimitForAction(action: string): LimitConfig | null {
  return LIMITS[action] ?? null;
}
