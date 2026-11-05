/**
 * Limited OpenAI access for free users — daily quota before upgrade CTA.
 * Reservations are committed only after a usable provider response is persisted.
 */
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

type DbCtx = { db: any };

export const FREE_OPENAI_DAILY_LIMIT =
  Number(process.env.FREE_OPENAI_DAILY_LIMIT) || 5;

const WINDOW_MS = 24 * 60 * 60 * 1000;
const RESERVATION_TTL_MS = 15 * 60 * 1000;

function bucketKey(userId: string): string {
  return `free-openai:${userId}`;
}

export type FreeOpenAiSnapshot = {
  remaining: number;
  limit: number;
  resetsAt: number;
};

function snapshot(limit: number, now: number, windowStartMs: number, count: number, reservedCount: number): FreeOpenAiSnapshot {
  return {
    remaining: Math.max(0, limit - count - reservedCount),
    limit,
    resetsAt: windowStartMs + WINDOW_MS,
  };
}

async function getBucket(ctx: DbCtx, userId: string) {
  return await ctx.db.query("feedbackRateLimits")
    .withIndex("by_bucket", (q: any) => q.eq("bucketKey", bucketKey(userId)))
    .first();
}

export async function getFreeOpenAiSnapshotDb(ctx: DbCtx, userId: string): Promise<FreeOpenAiSnapshot> {
  const limit = FREE_OPENAI_DAILY_LIMIT;
  const now = Date.now();
  const existing = await getBucket(ctx, userId);
  if (!existing || now - existing.windowStartMs > WINDOW_MS) {
    return { remaining: limit, limit, resetsAt: now + WINDOW_MS };
  }
  return snapshot(limit, now, existing.windowStartMs, existing.count ?? 0, existing.reservedCount ?? 0);
}

async function expireStaleReservations(ctx: DbCtx, userId: string, now: number) {
  const pending = await ctx.db.query("freeOpenAiQuotaReservations")
    .withIndex("by_user_status", (q: any) => q.eq("userId", userId).eq("status", "reserved"))
    .collect();
  for (const reservation of pending) {
    if (reservation.expiresAt > now) continue;
    const bucket = await getBucket(ctx, userId);
    if (bucket && bucket.windowStartMs === reservation.windowStartMs) {
      await ctx.db.patch(bucket._id, {
        reservedCount: Math.max(0, (bucket.reservedCount ?? 0) - 1),
      });
    }
    await ctx.db.patch(reservation._id, { status: "expired", updatedAt: now });
  }
}

export const getSnapshotInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => await getFreeOpenAiSnapshotDb(ctx, args.userId),
});

export const tryReserveInternal = internalMutation({
  args: { userId: v.string(), requestId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = FREE_OPENAI_DAILY_LIMIT;
    await expireStaleReservations(ctx, args.userId, now);

    const prior = await ctx.db.query("freeOpenAiQuotaReservations")
      .withIndex("by_request", (q: any) => q.eq("requestId", args.requestId))
      .first();
    if (prior && prior.userId !== args.userId) {
      throw new Error("Quota reservation request ID belongs to another user");
    }
    if (prior?.status === "committed") {
      return { ok: true, alreadyCommitted: true, snapshot: await getFreeOpenAiSnapshotDb(ctx, args.userId) };
    }
    if (prior?.status === "reserved" && prior.expiresAt > now) {
      return { ok: true, alreadyReserved: true, snapshot: await getFreeOpenAiSnapshotDb(ctx, args.userId) };
    }

    let bucket = await getBucket(ctx, args.userId);
    if (!bucket || now - bucket.windowStartMs > WINDOW_MS) {
      if (bucket) {
        await ctx.db.patch(bucket._id, { windowStartMs: now, count: 0, reservedCount: 0 });
        bucket = { ...bucket, windowStartMs: now, count: 0, reservedCount: 0 };
      } else {
        const id = await ctx.db.insert("feedbackRateLimits", {
          bucketKey: bucketKey(args.userId), windowStartMs: now, count: 0, reservedCount: 0,
        });
        bucket = await ctx.db.get(id);
      }
    }

    const count = bucket.count ?? 0;
    const reservedCount = bucket.reservedCount ?? 0;
    if (count + reservedCount >= limit) {
      return { ok: false, alreadyCommitted: false, snapshot: snapshot(limit, now, bucket.windowStartMs, count, reservedCount) };
    }

    await ctx.db.patch(bucket._id, { reservedCount: reservedCount + 1 });
    const reservationFields = {
      status: "reserved" as const,
      windowStartMs: bucket.windowStartMs,
      updatedAt: now,
      expiresAt: now + RESERVATION_TTL_MS,
    };
    if (prior) {
      await ctx.db.patch(prior._id, reservationFields);
    } else {
      await ctx.db.insert("freeOpenAiQuotaReservations", {
        userId: args.userId,
        requestId: args.requestId,
        createdAt: now,
        ...reservationFields,
      });
    }
    return {
      ok: true,
      alreadyReserved: false,
      alreadyCommitted: false,
      snapshot: snapshot(limit, now, bucket.windowStartMs, count, reservedCount + 1),
    };
  },
});

export const commitReservationInternal = internalMutation({
  args: { userId: v.string(), requestId: v.string() },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.query("freeOpenAiQuotaReservations")
      .withIndex("by_request", (q: any) => q.eq("requestId", args.requestId))
      .first();
    if (!reservation || reservation.userId !== args.userId || reservation.status !== "reserved") {
      return { committed: reservation?.status === "committed" };
    }
    const bucket = await getBucket(ctx, args.userId);
    if (bucket && bucket.windowStartMs === reservation.windowStartMs) {
      await ctx.db.patch(bucket._id, {
        count: (bucket.count ?? 0) + 1,
        reservedCount: Math.max(0, (bucket.reservedCount ?? 0) - 1),
      });
    }
    await ctx.db.patch(reservation._id, { status: "committed", updatedAt: Date.now() });
    return { committed: true };
  },
});

export const releaseReservationInternal = internalMutation({
  args: { userId: v.string(), requestId: v.string() },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.query("freeOpenAiQuotaReservations")
      .withIndex("by_request", (q: any) => q.eq("requestId", args.requestId))
      .first();
    if (!reservation || reservation.userId !== args.userId || reservation.status !== "reserved") {
      return { released: reservation?.status === "released" || reservation?.status === "expired" };
    }
    const bucket = await getBucket(ctx, args.userId);
    if (bucket && bucket.windowStartMs === reservation.windowStartMs) {
      await ctx.db.patch(bucket._id, {
        reservedCount: Math.max(0, (bucket.reservedCount ?? 0) - 1),
      });
    }
    await ctx.db.patch(reservation._id, { status: "released", updatedAt: Date.now() });
    return { released: true };
  },
});
