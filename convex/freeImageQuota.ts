/**
 * Free-tier AI image generation allowance — one successful image per Africa/Accra day.
 * Uses feedbackRateLimits for atomic reserve/release (concurrency-safe).
 * Only free (non-subscribed) users are subject to this quota; paid plans keep credits.
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

type DbCtx = { db: { query: Function; insert: Function; patch: Function } };

export const FREE_IMAGE_DAILY_LIMIT =
  Number(process.env.FREE_IMAGE_DAILY_LIMIT) || 1;

/** Product daily boundary for free AI images (Ghana). */
export const FREE_IMAGE_QUOTA_TIMEZONE =
  process.env.FREE_IMAGE_QUOTA_TIMEZONE?.trim() || "Africa/Accra";

export type FreeImageSnapshot = {
  remaining: number;
  limit: number;
  resetsAt: number;
  dateKey: string;
  timeZone: string;
};

/** YYYY-MM-DD in the configured timezone (Africa/Accra is UTC+0, no DST). */
export function freeImageDateKey(
  nowMs = Date.now(),
  timeZone = FREE_IMAGE_QUOTA_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}

/** Next local midnight after `nowMs` in the quota timezone. */
export function freeImageResetsAtMs(
  nowMs = Date.now(),
  timeZone = FREE_IMAGE_QUOTA_TIMEZONE
): number {
  const key = freeImageDateKey(nowMs, timeZone);
  // Accra/UTC: Date.UTC midnight of the following calendar day.
  if (timeZone === "Africa/Accra" || timeZone === "UTC" || timeZone === "Etc/UTC") {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0);
  }
  // Generic: binary-search the first ms whose dateKey differs.
  let lo = nowMs;
  let hi = nowMs + 48 * 60 * 60 * 1000;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (freeImageDateKey(mid, timeZone) === key) lo = mid;
    else hi = mid;
  }
  return hi;
}

function bucketKey(userId: string, dateKey: string): string {
  return `free-image:${userId}:${dateKey}`;
}

export async function getFreeImageSnapshotDb(
  ctx: DbCtx,
  userId: string,
  nowMs = Date.now()
): Promise<FreeImageSnapshot> {
  const limit = FREE_IMAGE_DAILY_LIMIT;
  const dateKey = freeImageDateKey(nowMs);
  const resetsAt = freeImageResetsAtMs(nowMs);
  const key = bucketKey(userId, dateKey);
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: { eq: Function }) => q.eq("bucketKey", key))
    .first();

  const used = existing?.count ?? 0;
  return {
    remaining: Math.max(0, limit - used),
    limit,
    resetsAt,
    dateKey,
    timeZone: FREE_IMAGE_QUOTA_TIMEZONE,
  };
}

/**
 * Atomically reserve one free image slot for today.
 * Call release on generation failure so failed attempts do not consume the allowance.
 */
async function tryReserveFreeImageDb(
  ctx: DbCtx,
  userId: string,
  nowMs = Date.now()
): Promise<{ ok: boolean; snapshot: FreeImageSnapshot }> {
  const limit = FREE_IMAGE_DAILY_LIMIT;
  const dateKey = freeImageDateKey(nowMs);
  const resetsAt = freeImageResetsAtMs(nowMs);
  const key = bucketKey(userId, dateKey);
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: { eq: Function }) => q.eq("bucketKey", key))
    .first();

  const used = existing?.count ?? 0;
  if (used >= limit) {
    return {
      ok: false,
      snapshot: {
        remaining: 0,
        limit,
        resetsAt,
        dateKey,
        timeZone: FREE_IMAGE_QUOTA_TIMEZONE,
      },
    };
  }

  if (existing) {
    await ctx.db.patch(existing._id, { count: used + 1 });
  } else {
    await ctx.db.insert("feedbackRateLimits", {
      bucketKey: key,
      windowStartMs: nowMs,
      count: 1,
    });
  }

  return {
    ok: true,
    snapshot: {
      remaining: Math.max(0, limit - (used + 1)),
      limit,
      resetsAt,
      dateKey,
      timeZone: FREE_IMAGE_QUOTA_TIMEZONE,
    },
  };
}

async function releaseFreeImageDb(
  ctx: DbCtx,
  userId: string,
  nowMs = Date.now()
): Promise<FreeImageSnapshot> {
  const limit = FREE_IMAGE_DAILY_LIMIT;
  const dateKey = freeImageDateKey(nowMs);
  const resetsAt = freeImageResetsAtMs(nowMs);
  const key = bucketKey(userId, dateKey);
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: { eq: Function }) => q.eq("bucketKey", key))
    .first();

  if (!existing || existing.count <= 0) {
    return {
      remaining: limit,
      limit,
      resetsAt,
      dateKey,
      timeZone: FREE_IMAGE_QUOTA_TIMEZONE,
    };
  }

  const next = Math.max(0, existing.count - 1);
  await ctx.db.patch(existing._id, { count: next });
  return {
    remaining: Math.max(0, limit - next),
    limit,
    resetsAt,
    dateKey,
    timeZone: FREE_IMAGE_QUOTA_TIMEZONE,
  };
}

export const getSnapshotInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await getFreeImageSnapshotDb(ctx, args.userId);
  },
});

export const tryReserveInternal = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await tryReserveFreeImageDb(ctx, args.userId);
  },
});

export const releaseInternal = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await releaseFreeImageDb(ctx, args.userId);
  },
});
