/**
 * Limited advanced-persona access for free users — daily quota before upgrade CTA.
 * Uses the existing feedbackRateLimits sliding-window table.
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

type DbCtx = { db: { query: Function; insert: Function; patch: Function } };

/** Free academic / advanced persona questions per rolling 24h window. */
export const FREE_ADVANCED_PERSONA_DAILY_LIMIT =
  Number(process.env.FREE_ADVANCED_PERSONA_DAILY_LIMIT) || 15;

const WINDOW_MS = 24 * 60 * 60 * 1000;

function bucketKey(userId: string): string {
  return `free-advanced-persona:${userId}`;
}

export type FreeAdvancedPersonaSnapshot = {
  remaining: number;
  limit: number;
  resetsAt: number;
};

export async function getFreeAdvancedPersonaSnapshotDb(
  ctx: DbCtx,
  userId: string
): Promise<FreeAdvancedPersonaSnapshot> {
  const limit = FREE_ADVANCED_PERSONA_DAILY_LIMIT;
  const now = Date.now();
  const key = bucketKey(userId);
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: { eq: Function }) => q.eq("bucketKey", key))
    .first();

  if (!existing || now - existing.windowStartMs > WINDOW_MS) {
    return { remaining: limit, limit, resetsAt: now + WINDOW_MS };
  }

  const used = existing.count ?? 0;
  return {
    remaining: Math.max(0, limit - used),
    limit,
    resetsAt: existing.windowStartMs + WINDOW_MS,
  };
}

export async function consumeFreeAdvancedPersonaDb(
  ctx: DbCtx,
  userId: string
): Promise<{ ok: boolean; snapshot: FreeAdvancedPersonaSnapshot }> {
  const limit = FREE_ADVANCED_PERSONA_DAILY_LIMIT;
  const now = Date.now();
  const key = bucketKey(userId);
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: { eq: Function }) => q.eq("bucketKey", key))
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
    return {
      ok: true,
      snapshot: { remaining: limit - 1, limit, resetsAt: now + WINDOW_MS },
    };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      snapshot: {
        remaining: 0,
        limit,
        resetsAt: existing.windowStartMs + WINDOW_MS,
      },
    };
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
  return {
    ok: true,
    snapshot: {
      remaining: Math.max(0, limit - (existing.count + 1)),
      limit,
      resetsAt: existing.windowStartMs + WINDOW_MS,
    },
  };
}

export const getSnapshotInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await getFreeAdvancedPersonaSnapshotDb(ctx, args.userId);
  },
});

export const tryConsumeInternal = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await consumeFreeAdvancedPersonaDb(ctx, args.userId);
  },
});
