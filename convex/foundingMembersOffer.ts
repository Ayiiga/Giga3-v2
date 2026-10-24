/**
 * Founding Members Teacher Promotion Premium — inventory, entitlement, admin.
 * Payments go through convex/paystack.ts (exam_founding_premium product type).
 */

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { isSubscriptionActive } from "./creditsConfig";
import {
  FOUNDING_MEMBERS_ACCESS_DURATION_DAYS,
  FOUNDING_MEMBERS_ACCESS_DURATION_LABEL,
  FOUNDING_MEMBERS_ACCESS_DURATION_MS,
  FOUNDING_MEMBERS_CURRENCY,
  FOUNDING_MEMBERS_MAX_ALLOCATIONS,
  FOUNDING_MEMBERS_OFFER_ID,
  FOUNDING_MEMBERS_PRICE_GHS,
  FOUNDING_MEMBERS_PRODUCT_ID,
  FOUNDING_MEMBERS_PRODUCT_NAME,
  FOUNDING_MEMBERS_RESERVATION_TTL_MS_DEFAULT,
  computeRemainingAllocations,
  hasActiveExamFoundingPremium,
  nextExamFoundingPremiumExpiry,
} from "../web/lib/gigalearn/examPractice/foundingMembersOffer";
import { hasExamPracticePremiumAccess } from "../web/lib/gigalearn/examPractice/practiceLimits";

export {
  FOUNDING_MEMBERS_ACCESS_DURATION_MS,
  FOUNDING_MEMBERS_MAX_ALLOCATIONS,
  FOUNDING_MEMBERS_OFFER_ID,
  FOUNDING_MEMBERS_PRICE_GHS,
  FOUNDING_MEMBERS_PRODUCT_ID,
  FOUNDING_MEMBERS_PRODUCT_NAME,
};

/** Live checkout requires explicit Convex env — default off. */
export function isFoundingMembersOfferLive(): boolean {
  return process.env.FOUNDING_MEMBERS_OFFER_LIVE?.trim() === "true";
}

export function foundingMembersReservationTtlMs(): number {
  const raw = process.env.FOUNDING_MEMBERS_RESERVATION_TTL_MINUTES?.trim();
  if (!raw) return FOUNDING_MEMBERS_RESERVATION_TTL_MS_DEFAULT;
  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 24 * 60) {
    return FOUNDING_MEMBERS_RESERVATION_TTL_MS_DEFAULT;
  }
  return Math.round(minutes * 60 * 1000);
}

export function getFoundingMembersProduct() {
  return {
    label: FOUNDING_MEMBERS_PRODUCT_NAME,
    amountGhs: FOUNDING_MEMBERS_PRICE_GHS,
    type: "exam_founding_premium" as const,
    offerId: FOUNDING_MEMBERS_OFFER_ID,
    accessDurationMs: FOUNDING_MEMBERS_ACCESS_DURATION_MS,
    planId: undefined,
  };
}

async function ensureSlots(ctx: MutationCtx, offerId: string, now: number) {
  const existing = await ctx.db
    .query("foundingOfferSlots")
    .withIndex("by_offer_slot", (q) => q.eq("offerId", offerId))
    .take(FOUNDING_MEMBERS_MAX_ALLOCATIONS + 1);
  if (existing.length >= FOUNDING_MEMBERS_MAX_ALLOCATIONS) return;

  const have = new Set(existing.map((s) => s.slotIndex));
  for (let i = 0; i < FOUNDING_MEMBERS_MAX_ALLOCATIONS; i++) {
    if (have.has(i)) continue;
    await ctx.db.insert("foundingOfferSlots", {
      offerId,
      slotIndex: i,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Mark abandoned reservations as `expired` but keep paymentReference/userId so a
 * late Paystack success can still fulfil. Expired seats do not count against the
 * 30-slot cap; they are reclaimed to `open` when a new checkout needs a seat.
 */
async function expireStaleReservations(
  ctx: MutationCtx,
  offerId: string,
  now: number
): Promise<number> {
  const reserved = await ctx.db
    .query("foundingOfferSlots")
    .withIndex("by_offer_status", (q) =>
      q.eq("offerId", offerId).eq("status", "reserved")
    )
    .take(FOUNDING_MEMBERS_MAX_ALLOCATIONS);
  let n = 0;
  for (const slot of reserved) {
    if (
      slot.reservationExpiresAt != null &&
      slot.reservationExpiresAt <= now
    ) {
      await ctx.db.patch(slot._id, {
        status: "expired",
        updatedAt: now,
      });
      await ctx.db.insert("foundingOfferEvents", {
        offerId,
        eventType: "reservation_expired",
        userId: slot.userId,
        paymentReference: slot.paymentReference,
        createdAt: now,
      });
      n++;
    }
  }
  return n;
}

/** Reclaim expired/released seats into the open pool (clears identity fields). */
async function reclaimExpiredSlotsToOpen(
  ctx: MutationCtx,
  offerId: string,
  now: number
): Promise<void> {
  for (const status of ["expired", "released", "failed"] as const) {
    const rows = await ctx.db
      .query("foundingOfferSlots")
      .withIndex("by_offer_status", (q) =>
        q.eq("offerId", offerId).eq("status", status)
      )
      .take(FOUNDING_MEMBERS_MAX_ALLOCATIONS);
    for (const slot of rows) {
      // Never reclaim a seat that still has a paymentReference until fulfil had a
      // chance — only reclaim expired seats older than the reservation TTL window
      // again (grace), or failed/released immediately.
      if (status === "expired") {
        const expiredAt = slot.reservationExpiresAt ?? slot.updatedAt;
        if (now - expiredAt < foundingMembersReservationTtlMs()) {
          continue; // grace for late webhooks
        }
      }
      await ctx.db.patch(slot._id, {
        status: "open",
        userId: undefined,
        paymentReference: undefined,
        amountGhs: undefined,
        reservedAt: undefined,
        reservationExpiresAt: undefined,
        paidAt: undefined,
        updatedAt: now,
      });
    }
  }
}

async function countSlots(
  ctx: QueryCtx | MutationCtx,
  offerId: string,
  status: "paid" | "reserved" | "open"
) {
  const rows = await ctx.db
    .query("foundingOfferSlots")
    .withIndex("by_offer_status", (q) =>
      q.eq("offerId", offerId).eq("status", status)
    )
    .take(FOUNDING_MEMBERS_MAX_ALLOCATIONS);
  return rows.length;
}

async function activeReservedCount(
  ctx: QueryCtx | MutationCtx,
  offerId: string,
  now: number
) {
  const reserved = await ctx.db
    .query("foundingOfferSlots")
    .withIndex("by_offer_status", (q) =>
      q.eq("offerId", offerId).eq("status", "reserved")
    )
    .take(FOUNDING_MEMBERS_MAX_ALLOCATIONS);
  return reserved.filter(
    (s) =>
      s.reservationExpiresAt != null && s.reservationExpiresAt > now
  ).length;
}

async function userPaidSlot(
  ctx: QueryCtx | MutationCtx,
  offerId: string,
  userId: string
) {
  const rows = await ctx.db
    .query("foundingOfferSlots")
    .withIndex("by_offer_user", (q) =>
      q.eq("offerId", offerId).eq("userId", userId)
    )
    .take(10);
  return rows.find((r) => r.status === "paid") ?? null;
}

async function userActiveReservation(
  ctx: QueryCtx | MutationCtx,
  offerId: string,
  userId: string,
  now: number
) {
  const rows = await ctx.db
    .query("foundingOfferSlots")
    .withIndex("by_offer_user", (q) =>
      q.eq("offerId", offerId).eq("userId", userId)
    )
    .take(10);
  return (
    rows.find(
      (r) =>
        r.status === "reserved" &&
        r.reservationExpiresAt != null &&
        r.reservationExpiresAt > now
    ) ?? null
  );
}

async function viewerPremiumFlags(
  ctx: QueryCtx | MutationCtx,
  email: string | null,
  now: number
) {
  if (!email) {
    return {
      signedIn: false,
      alreadyPurchased: false,
      hasActivePremiumAccess: false,
      examPracticePremiumExpiresAt: null as number | null,
    };
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  const paid = await userPaidSlot(ctx, FOUNDING_MEMBERS_OFFER_ID, email);
  const hasPurchasedCredits = user
    ? await ctx.db
        .query("creditLogs")
        .withIndex("by_user_created", (q) => q.eq("userId", email))
        .order("desc")
        .take(50)
        .then((rows) => rows.some((row) => row.action === "credit_purchase"))
    : false;
  const subscriptionActive = isSubscriptionActive(
    user?.subscriptionPlan ?? "free",
    user?.subscriptionExpiresAt
  );
  const hasActivePremiumAccess = hasExamPracticePremiumAccess({
    subscriptionActive,
    hasPurchasedCredits,
    examPracticePremiumExpiresAt: user?.examPracticePremiumExpiresAt,
    now,
  });
  return {
    signedIn: true,
    alreadyPurchased: Boolean(paid),
    hasActivePremiumAccess,
    examPracticePremiumExpiresAt: user?.examPracticePremiumExpiresAt ?? null,
  };
}

export const getOfferStatus = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let email: string | null = null;
    if (args.sessionToken) {
      try {
        email = await requireSession(args.sessionToken, ctx);
      } catch {
        email = null;
      }
    }
    const paidCount = await countSlots(ctx, FOUNDING_MEMBERS_OFFER_ID, "paid");
    const reservedActiveCount = await activeReservedCount(
      ctx,
      FOUNDING_MEMBERS_OFFER_ID,
      now
    );
    const remaining = computeRemainingAllocations({
      maxAllocations: FOUNDING_MEMBERS_MAX_ALLOCATIONS,
      paidCount,
      reservedActiveCount,
    });
    const viewer = await viewerPremiumFlags(ctx, email, now);
    const liveCheckoutEnabled = isFoundingMembersOfferLive();
    return {
      offerId: FOUNDING_MEMBERS_OFFER_ID,
      productId: FOUNDING_MEMBERS_PRODUCT_ID,
      name: FOUNDING_MEMBERS_PRODUCT_NAME,
      priceGhs: FOUNDING_MEMBERS_PRICE_GHS,
      currency: FOUNDING_MEMBERS_CURRENCY,
      maxAllocations: FOUNDING_MEMBERS_MAX_ALLOCATIONS,
      accessDurationDays: FOUNDING_MEMBERS_ACCESS_DURATION_DAYS,
      accessDurationLabel: FOUNDING_MEMBERS_ACCESS_DURATION_LABEL,
      liveCheckoutEnabled,
      remaining,
      paidCount,
      reservedActiveCount,
      soldOut: remaining <= 0,
      viewer,
    };
  },
});

const funnelEventValidator = v.union(
  v.literal("impression"),
  v.literal("checkout_abandon"),
  v.literal("sold_out_view"),
  v.literal("free_practice_started"),
  v.literal("free_practice_completed"),
  v.literal("upgrade_modal_shown"),
  v.literal("upgrade_modal_dismissed"),
  v.literal("upgrade_ghs30_selected"),
  v.literal("upgrade_ghs60_selected"),
  v.literal("upgrade_credits_selected"),
  v.literal("payment_initiated")
);

export const recordOfferEvent = mutation({
  args: {
    eventType: funnelEventValidator,
    sessionToken: v.optional(v.string()),
    meta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId: string | undefined;
    if (args.sessionToken) {
      try {
        userId = await requireSession(args.sessionToken, ctx);
      } catch {
        userId = undefined;
      }
    }
    await ctx.db.insert("foundingOfferEvents", {
      offerId: FOUNDING_MEMBERS_OFFER_ID,
      eventType: args.eventType,
      userId,
      meta: args.meta?.slice(0, 200),
      createdAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/**
 * Reserve one slot + prepare checkout fields. Called from paystack initialize
 * inside a single mutation path for atomicity with payment record creation.
 */
export const reserveSlotForCheckout = internalMutation({
  args: {
    userId: v.string(),
    paymentReference: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isFoundingMembersOfferLive()) {
      throw new Error(
        "Founding Members offer is not live yet. Set FOUNDING_MEMBERS_OFFER_LIVE=true after duration approval."
      );
    }
    const now = Date.now();
    const offerId = FOUNDING_MEMBERS_OFFER_ID;
    await ensureSlots(ctx, offerId, now);
    await expireStaleReservations(ctx, offerId, now);
    await reclaimExpiredSlotsToOpen(ctx, offerId, now);

    const alreadyPaid = await userPaidSlot(ctx, offerId, args.userId);
    if (alreadyPaid) {
      throw new Error("You already claimed a Founding Members allocation.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) throw new Error("Account not found.");

    const hasPurchasedCredits = await ctx.db
      .query("creditLogs")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50)
      .then((rows) => rows.some((row) => row.action === "credit_purchase"));
    const subscriptionActive = isSubscriptionActive(
      user.subscriptionPlan ?? "free",
      user.subscriptionExpiresAt
    );
    if (
      hasExamPracticePremiumAccess({
        subscriptionActive,
        hasPurchasedCredits,
        examPracticePremiumExpiresAt: user.examPracticePremiumExpiresAt,
        now,
      })
    ) {
      throw new Error(
        "You already have Teacher Promotion premium access. This Founding Members seat is reserved for teachers who need it."
      );
    }

    const existingRes = await userActiveReservation(
      ctx,
      offerId,
      args.userId,
      now
    );
    if (existingRes) {
      await ctx.db.patch(existingRes._id, {
        paymentReference: args.paymentReference,
        amountGhs: FOUNDING_MEMBERS_PRICE_GHS,
        updatedAt: now,
      });
      await ctx.db.insert("foundingOfferEvents", {
        offerId,
        eventType: "checkout_start",
        userId: args.userId,
        paymentReference: args.paymentReference,
        createdAt: now,
      });
      return {
        slotId: existingRes._id,
        slotIndex: existingRes.slotIndex,
        reservationExpiresAt: existingRes.reservationExpiresAt!,
        amountGhs: FOUNDING_MEMBERS_PRICE_GHS,
        reused: true as const,
      };
    }

    const paidCount = await countSlots(ctx, offerId, "paid");
    const reservedActiveCount = await activeReservedCount(ctx, offerId, now);
    const remaining = computeRemainingAllocations({
      maxAllocations: FOUNDING_MEMBERS_MAX_ALLOCATIONS,
      paidCount,
      reservedActiveCount,
    });
    if (remaining <= 0) {
      throw new Error(
        "Founding Members offer is sold out — all 30 allocations are claimed or reserved."
      );
    }

    const openSlots = await ctx.db
      .query("foundingOfferSlots")
      .withIndex("by_offer_status", (q) =>
        q.eq("offerId", offerId).eq("status", "open")
      )
      .take(FOUNDING_MEMBERS_MAX_ALLOCATIONS);
    // Prefer lowest slot index for stable allocation order.
    openSlots.sort((a, b) => a.slotIndex - b.slotIndex);
    const slot = openSlots[0];
    if (!slot) {
      throw new Error(
        "Founding Members offer is sold out — no open allocations remain."
      );
    }

    const reservationExpiresAt = now + foundingMembersReservationTtlMs();
    await ctx.db.patch(slot._id, {
      status: "reserved",
      userId: args.userId,
      paymentReference: args.paymentReference,
      amountGhs: FOUNDING_MEMBERS_PRICE_GHS,
      reservedAt: now,
      reservationExpiresAt,
      updatedAt: now,
    });
    await ctx.db.insert("foundingOfferEvents", {
      offerId,
      eventType: "checkout_start",
      userId: args.userId,
      paymentReference: args.paymentReference,
      createdAt: now,
    });
    return {
      slotId: slot._id,
      slotIndex: slot.slotIndex,
      reservationExpiresAt,
      amountGhs: FOUNDING_MEMBERS_PRICE_GHS,
      reused: false as const,
    };
  },
});

export const releaseReservationByReference = internalMutation({
  args: {
    paymentReference: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const slot = await ctx.db
      .query("foundingOfferSlots")
      .withIndex("by_reference", (q) =>
        q.eq("paymentReference", args.paymentReference)
      )
      .first();
    if (!slot || slot.status !== "reserved") {
      return { released: false as const };
    }
    await ctx.db.patch(slot._id, {
      status: "open",
      userId: undefined,
      paymentReference: undefined,
      amountGhs: undefined,
      reservedAt: undefined,
      reservationExpiresAt: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("foundingOfferEvents", {
      offerId: slot.offerId,
      eventType: args.reason === "failed" ? "payment_failed" : "checkout_abandon",
      userId: slot.userId,
      paymentReference: args.paymentReference,
      meta: args.reason?.slice(0, 80),
      createdAt: now,
    });
    return { released: true as const };
  },
});

export const fulfillFoundingMembersPurchase = internalMutation({
  args: {
    userId: v.string(),
    paymentReference: v.string(),
    amountGhs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.amountGhs !== FOUNDING_MEMBERS_PRICE_GHS) {
      throw new Error(
        `Founding Members amount mismatch: expected ${FOUNDING_MEMBERS_PRICE_GHS}, got ${args.amountGhs}`
      );
    }
    let slot = await ctx.db
      .query("foundingOfferSlots")
      .withIndex("by_reference", (q) =>
        q.eq("paymentReference", args.paymentReference)
      )
      .first();

    // Idempotent: user already paid this offer under another path.
    const existingPaid = await userPaidSlot(
      ctx,
      FOUNDING_MEMBERS_OFFER_ID,
      args.userId
    );
    if (existingPaid && existingPaid.paymentReference === args.paymentReference) {
      return { alreadyFulfilled: true as const };
    }
    if (existingPaid) {
      // One founding seat per user — release any orphan reservation for this
      // verified duplicate payment so it cannot block inventory forever.
      if (slot && (slot.status === "reserved" || slot.status === "expired")) {
        await ctx.db.patch(slot._id, {
          status: "open",
          userId: undefined,
          paymentReference: undefined,
          amountGhs: undefined,
          reservedAt: undefined,
          reservationExpiresAt: undefined,
          updatedAt: now,
        });
      }
      return { alreadyFulfilled: true as const };
    }

    if (slot && slot.userId && slot.userId !== args.userId) {
      throw new Error("Founding Members payment user mismatch.");
    }
    if (slot?.status === "paid") {
      return { alreadyFulfilled: true as const };
    }

    // Cap before claiming.
    const paidCount = await countSlots(ctx, FOUNDING_MEMBERS_OFFER_ID, "paid");
    if (paidCount >= FOUNDING_MEMBERS_MAX_ALLOCATIONS) {
      throw new Error(
        "Founding Members offer is sold out — cannot fulfil additional purchases."
      );
    }

    const claimable =
      slot &&
      (slot.status === "reserved" ||
        slot.status === "expired" ||
        slot.status === "failed");

    // Late webhook after reclaim: claim an open seat for this verified payment.
    if (!claimable) {
      await ensureSlots(ctx, FOUNDING_MEMBERS_OFFER_ID, now);
      await reclaimExpiredSlotsToOpen(ctx, FOUNDING_MEMBERS_OFFER_ID, now);
      const openSlots = await ctx.db
        .query("foundingOfferSlots")
        .withIndex("by_offer_status", (q) =>
          q.eq("offerId", FOUNDING_MEMBERS_OFFER_ID).eq("status", "open")
        )
        .take(FOUNDING_MEMBERS_MAX_ALLOCATIONS);
      openSlots.sort((a, b) => a.slotIndex - b.slotIndex);
      slot = openSlots[0] ?? null;
      if (!slot) {
        throw new Error(
          "Founding Members reservation not found and no open seat remains for verified payment."
        );
      }
    }

    await ctx.db.patch(slot._id, {
      status: "paid",
      paidAt: now,
      amountGhs: FOUNDING_MEMBERS_PRICE_GHS,
      userId: args.userId,
      paymentReference: args.paymentReference,
      updatedAt: now,
    });

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) throw new Error("User not found for Founding Members fulfilment.");

    // Exactly one founding period from this payment: if this reference already
    // set the entitlement, skip; otherwise grant from now (or extend if active).
    const alreadyFromThisPayment =
      user.examPracticePremiumPaymentRef === args.paymentReference &&
      typeof user.examPracticePremiumExpiresAt === "number" &&
      user.examPracticePremiumExpiresAt > now;
    let expiresAt = user.examPracticePremiumExpiresAt ?? null;
    if (!alreadyFromThisPayment) {
      expiresAt = nextExamFoundingPremiumExpiry({
        now,
        currentExpiresAt: user.examPracticePremiumExpiresAt,
        durationMs: FOUNDING_MEMBERS_ACCESS_DURATION_MS,
      });
      await ctx.db.patch(user._id, {
        examPracticePremiumExpiresAt: expiresAt,
        examPracticePremiumOfferId: FOUNDING_MEMBERS_OFFER_ID,
        examPracticePremiumPaymentRef: args.paymentReference,
      });
    }

    await ctx.db.insert("foundingOfferEvents", {
      offerId: FOUNDING_MEMBERS_OFFER_ID,
      eventType: "payment_success",
      userId: args.userId,
      paymentReference: args.paymentReference,
      createdAt: now,
    });
    if (!alreadyFromThisPayment) {
      await ctx.db.insert("foundingOfferEvents", {
        offerId: FOUNDING_MEMBERS_OFFER_ID,
        eventType: "entitlement_activated",
        userId: args.userId,
        paymentReference: args.paymentReference,
        meta: JSON.stringify({
          expiresAt,
          durationDays: FOUNDING_MEMBERS_ACCESS_DURATION_DAYS,
        }),
        createdAt: now,
      });
    }

    return {
      alreadyFulfilled: false as const,
      expiresAt: expiresAt ?? now,
      slotIndex: slot.slotIndex,
    };
  },
});

export const expireAbandonedReservations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    await ensureSlots(ctx, FOUNDING_MEMBERS_OFFER_ID, now);
    const n = await expireStaleReservations(
      ctx,
      FOUNDING_MEMBERS_OFFER_ID,
      now
    );
    await reclaimExpiredSlotsToOpen(ctx, FOUNDING_MEMBERS_OFFER_ID, now);
    return { expired: n };
  },
});

export const adminOfferAudit = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    try {
      await ensureAdminAccess(args);
    } catch {
      return null;
    }
    const now = Date.now();
    const offerId = FOUNDING_MEMBERS_OFFER_ID;
    const slots = await ctx.db
      .query("foundingOfferSlots")
      .withIndex("by_offer_slot", (q) => q.eq("offerId", offerId))
      .take(FOUNDING_MEMBERS_MAX_ALLOCATIONS);
    const events = await ctx.db
      .query("foundingOfferEvents")
      .withIndex("by_offer_created", (q) => q.eq("offerId", offerId))
      .order("desc")
      .take(100);
    const paid = slots.filter((s) => s.status === "paid");
    const reserved = slots.filter(
      (s) =>
        s.status === "reserved" &&
        s.reservationExpiresAt != null &&
        s.reservationExpiresAt > now
    );
    return {
      offerId,
      liveCheckoutEnabled: isFoundingMembersOfferLive(),
      priceGhs: FOUNDING_MEMBERS_PRICE_GHS,
      maxAllocations: FOUNDING_MEMBERS_MAX_ALLOCATIONS,
      accessDurationLabel: FOUNDING_MEMBERS_ACCESS_DURATION_LABEL,
      paidCount: paid.length,
      reservedActiveCount: reserved.length,
      remaining: computeRemainingAllocations({
        maxAllocations: FOUNDING_MEMBERS_MAX_ALLOCATIONS,
        paidCount: paid.length,
        reservedActiveCount: reserved.length,
      }),
      slots: slots.map((s) => ({
        slotIndex: s.slotIndex,
        status: s.status,
        userId: s.userId ?? null,
        paymentReference: s.paymentReference ?? null,
        amountGhs: s.amountGhs ?? null,
        reservedAt: s.reservedAt ?? null,
        reservationExpiresAt: s.reservationExpiresAt ?? null,
        paidAt: s.paidAt ?? null,
      })),
      recentEvents: events.map((e) => ({
        eventType: e.eventType,
        userId: e.userId ?? null,
        paymentReference: e.paymentReference ?? null,
        meta: e.meta ?? null,
        createdAt: e.createdAt,
      })),
    };
  },
});

export const getSlotByReferenceInternal = internalQuery({
  args: { paymentReference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("foundingOfferSlots")
      .withIndex("by_reference", (q) =>
        q.eq("paymentReference", args.paymentReference)
      )
      .first();
  },
});

export function foundingPremiumActiveOnUser(
  user: { examPracticePremiumExpiresAt?: number | null } | null | undefined,
  now = Date.now()
): boolean {
  return hasActiveExamFoundingPremium({
    examPracticePremiumExpiresAt: user?.examPracticePremiumExpiresAt,
    now,
  });
}
