import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { creditActionValidator } from "./schema";
import {
  CREDIT_RESERVATION_STALE_MS,
  decideCapture,
  decideRelease,
  decideReserve,
  type CreditReservationRecord,
} from "./creditReservationLogic";
import type { CreditAction } from "./creditsConfig";
import { CREDIT_COSTS } from "./creditsConfig";

type DbCtx = { db: any };

async function getUserByEmail(ctx: DbCtx, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
}

async function getReservation(ctx: DbCtx, userId: string, requestId: string) {
  return await ctx.db
    .query("creditReservations")
    .withIndex("by_user_request", (q: any) => q.eq("userId", userId).eq("requestId", requestId))
    .unique();
}

async function logCredit(
  ctx: DbCtx,
  args: {
    userId: string;
    action: CreditAction | "refund";
    amount: number;
    balanceAfter: number;
    reference?: string;
    metadata?: string;
  }
) {
  await ctx.db.insert("creditLogs", {
    userId: args.userId,
    action: args.action,
    amount: args.amount,
    balanceAfter: args.balanceAfter,
    reference: args.reference,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

async function releaseRow(
  ctx: DbCtx,
  userId: string,
  row: { _id: any; amount: number; reference?: string; metadata?: string }
) {
  const user = await getUserByEmail(ctx, userId);
  if (!user) throw new Error("User not found");
  const balanceAfter = (user.credits ?? 0) + row.amount;
  await ctx.db.patch(user._id, { credits: balanceAfter });
  await ctx.db.patch(row._id, { status: "released", updatedAt: Date.now() });
  await logCredit(ctx, {
    userId,
    action: "refund",
    amount: row.amount,
    balanceAfter,
    reference: row.reference ? `${row.reference}:release` : undefined,
    metadata: row.metadata,
  });
  return balanceAfter;
}

/**
 * Atomically reserve credits before paid generation.
 * Deducts from the user balance in the same mutation that inserts the reservation.
 */
export const tryReserveInternal = internalMutation({
  args: {
    userId: v.string(),
    requestId: v.string(),
    action: creditActionValidator,
    amount: v.optional(v.number()),
    reference: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requestId = args.requestId.trim();
    if (!requestId || requestId.length > 128) {
      throw new Error("Invalid generation request id.");
    }

    const action = args.action as CreditAction;
    if (!(action in CREDIT_COSTS)) {
      throw new Error("Invalid credit action for reservation");
    }
    const amount = args.amount ?? CREDIT_COSTS[action];
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid credit amount");
    }

    const user = await getUserByEmail(ctx, args.userId);
    if (!user) throw new Error("User not found");

    const existingDoc = await getReservation(ctx, args.userId, requestId);
    const existing: CreditReservationRecord | null = existingDoc
      ? {
          requestId: existingDoc.requestId,
          userId: existingDoc.userId,
          action: existingDoc.action,
          amount: existingDoc.amount,
          status: existingDoc.status,
          createdAt: existingDoc.createdAt,
          updatedAt: existingDoc.updatedAt,
          reference: existingDoc.reference,
          metadata: existingDoc.metadata,
        }
      : null;

    const now = Date.now();
    let decision = decideReserve({
      existing,
      balance: user.credits ?? 0,
      amount,
      now,
      staleMs: CREDIT_RESERVATION_STALE_MS,
    });

    if (decision.kind === "recover_stale" && existingDoc) {
      await releaseRow(ctx, args.userId, existingDoc);
      const refreshedUser = await getUserByEmail(ctx, args.userId);
      decision = decideReserve({
        existing: null,
        balance: refreshedUser?.credits ?? 0,
        amount,
        now,
        staleMs: CREDIT_RESERVATION_STALE_MS,
      });
    }

    if (decision.kind === "reject_insufficient") {
      return {
        ok: false as const,
        reason: "insufficient" as const,
        balance: (await getUserByEmail(ctx, args.userId))?.credits ?? 0,
        required: amount,
      };
    }
    if (decision.kind === "reject_in_progress") {
      return { ok: false as const, reason: "in_progress" as const };
    }
    if (decision.kind === "reject_already_completed") {
      return { ok: false as const, reason: "already_completed" as const };
    }

    const latest = await getUserByEmail(ctx, args.userId);
    if (!latest) throw new Error("User not found");
    const balance = latest.credits ?? 0;
    if (balance < amount) {
      return {
        ok: false as const,
        reason: "insufficient" as const,
        balance,
        required: amount,
      };
    }

    const balanceAfter = balance - amount;
    await ctx.db.patch(latest._id, { credits: balanceAfter });
    // Replace a released row in place when reusing the same requestId.
    if (existingDoc && existingDoc.status === "released") {
      await ctx.db.patch(existingDoc._id, {
        action,
        amount,
        status: "reserved",
        reference: args.reference,
        metadata: args.metadata,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("creditReservations", {
        userId: args.userId,
        requestId,
        action,
        amount,
        status: "reserved",
        reference: args.reference,
        metadata: args.metadata,
        createdAt: now,
        updatedAt: now,
      });
    }
    await logCredit(ctx, {
      userId: args.userId,
      action,
      amount: -amount,
      balanceAfter,
      reference: args.reference,
      metadata: args.metadata,
    });

    return {
      ok: true as const,
      status: "reserved" as const,
      amount,
      balanceAfter,
    };
  },
});

/** Mark a reservation captured after successful paid generation (credits already deducted). */
export const captureInternal = internalMutation({
  args: {
    userId: v.string(),
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await getReservation(ctx, args.userId, args.requestId.trim());
    const decision = decideCapture(
      row
        ? {
            requestId: row.requestId,
            userId: row.userId,
            action: row.action,
            amount: row.amount,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          }
        : null
    );
    if (decision.kind === "missing") return { ok: false as const, reason: "missing" as const };
    if (decision.kind === "noop_already_captured") return { ok: true as const, status: "captured" as const };
    if (decision.kind === "noop_already_released") {
      return { ok: false as const, reason: "already_released" as const };
    }
    await ctx.db.patch(row!._id, { status: "captured", updatedAt: Date.now() });
    return { ok: true as const, status: "captured" as const };
  },
});

/** Refund a reserved (not captured) generation and mark released. */
export const releaseInternal = internalMutation({
  args: {
    userId: v.string(),
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await getReservation(ctx, args.userId, args.requestId.trim());
    const decision = decideRelease(
      row
        ? {
            requestId: row.requestId,
            userId: row.userId,
            action: row.action,
            amount: row.amount,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          }
        : null
    );
    if (decision.kind === "missing") return { ok: false as const, reason: "missing" as const };
    if (decision.kind === "noop_already_released") return { ok: true as const, status: "released" as const };
    if (decision.kind === "noop_already_captured") {
      return { ok: false as const, reason: "already_captured" as const };
    }
    const balanceAfter = await releaseRow(ctx, args.userId, row!);
    return { ok: true as const, status: "released" as const, balanceAfter };
  },
});
