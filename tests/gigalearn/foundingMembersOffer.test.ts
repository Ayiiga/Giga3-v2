/**
 * Founding Members Teacher Promotion Premium — pricing, inventory, entitlement,
 * and Paystack wiring safety (mocked; no live charges).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FOUNDING_MEMBERS_ACCESS_DURATION_DAYS,
  FOUNDING_MEMBERS_ACCESS_DURATION_MS,
  FOUNDING_MEMBERS_CURRENCY,
  FOUNDING_MEMBERS_MAX_ALLOCATIONS,
  FOUNDING_MEMBERS_OFFER_ID,
  FOUNDING_MEMBERS_PRICE_GHS,
  FOUNDING_MEMBERS_PRODUCT_ID,
  FOUNDING_MEMBERS_PRODUCT_NAME,
  FOUNDING_MEMBERS_RESERVATION_TTL_MS_DEFAULT,
  computeRemainingAllocations,
  foundingMembersPesewas,
  hasActiveExamFoundingPremium,
  isReservationActive,
  nextExamFoundingPremiumExpiry,
} from "../../web/lib/gigalearn/examPractice/foundingMembersOffer";
import {
  EXAM_PRACTICE_FREE_QUESTION_COUNT,
  hasExamPracticePremiumAccess,
  resolveExamPracticeSessionCount,
} from "../../web/lib/gigalearn/examPractice/practiceLimits";
import { SUBSCRIPTION_PERIOD_MS } from "../../convex/subscriptionPlans";

const ROOT = resolve(__dirname, "../..");

describe("Founding Members offer — pricing & currency", () => {
  it("is exactly GHS 30.00 (3000 pesewas) one-time", () => {
    expect(FOUNDING_MEMBERS_PRICE_GHS).toBe(30);
    expect(FOUNDING_MEMBERS_CURRENCY).toBe("GHS");
    expect(foundingMembersPesewas()).toBe(3000);
    expect(FOUNDING_MEMBERS_MAX_ALLOCATIONS).toBe(30);
    expect(FOUNDING_MEMBERS_PRODUCT_NAME).toMatch(/Founding Members/i);
    expect(FOUNDING_MEMBERS_PRODUCT_ID).toBe("exam_founding_members_premium_v1");
    expect(FOUNDING_MEMBERS_OFFER_ID).toBe("gigalearn_teacher_promo_founding_v1");
  });

  it("access duration matches existing subscription period (30 days) — for approval", () => {
    expect(FOUNDING_MEMBERS_ACCESS_DURATION_MS).toBe(SUBSCRIPTION_PERIOD_MS);
    expect(FOUNDING_MEMBERS_ACCESS_DURATION_DAYS).toBe(30);
  });
});

describe("Founding Members inventory math", () => {
  it("computes remaining seats from paid + active reserved", () => {
    expect(
      computeRemainingAllocations({
        maxAllocations: 30,
        paidCount: 10,
        reservedActiveCount: 5,
      })
    ).toBe(15);
  });

  it("sold out at exactly 30 qualifying claims", () => {
    expect(
      computeRemainingAllocations({
        maxAllocations: 30,
        paidCount: 30,
        reservedActiveCount: 0,
      })
    ).toBe(0);
    expect(
      computeRemainingAllocations({
        maxAllocations: 30,
        paidCount: 29,
        reservedActiveCount: 1,
      })
    ).toBe(0);
  });

  it("31st customer sees zero remaining (cannot purchase)", () => {
    const remaining = computeRemainingAllocations({
      maxAllocations: 30,
      paidCount: 30,
      reservedActiveCount: 0,
    });
    expect(remaining).toBe(0);
    expect(remaining > 0).toBe(false);
  });

  it("treats only non-expired reservations as active", () => {
    const now = 1_000_000;
    expect(
      isReservationActive({
        status: "reserved",
        reservationExpiresAt: now + 1,
        now,
      })
    ).toBe(true);
    expect(
      isReservationActive({
        status: "reserved",
        reservationExpiresAt: now - 1,
        now,
      })
    ).toBe(false);
    expect(
      isReservationActive({
        status: "paid",
        reservationExpiresAt: now + 999,
        now,
      })
    ).toBe(false);
  });

  it("default reservation TTL is configurable and positive", () => {
    expect(FOUNDING_MEMBERS_RESERVATION_TTL_MS_DEFAULT).toBe(30 * 60 * 1000);
  });
});

describe("Founding Members entitlement", () => {
  const now = Date.UTC(2026, 9, 23, 12, 0, 0);

  it("activates premium packs while founding expiry is in the future", () => {
    expect(
      hasExamPracticePremiumAccess({
        examPracticePremiumExpiresAt: now + 60_000,
        now,
      })
    ).toBe(true);
    const resolved = resolveExamPracticeSessionCount({
      requested: 500,
      courseSlug: "exam-ad-ii",
      bankSize: 200,
      examPracticePremiumExpiresAt: now + 60_000,
      now,
    });
    expect(resolved.premiumAccess).toBe(true);
    expect(resolved.count).toBe(200);
  });

  it("denies premium after founding expiry (unless other entitlements)", () => {
    expect(
      hasExamPracticePremiumAccess({
        examPracticePremiumExpiresAt: now - 1,
        now,
      })
    ).toBe(false);
    expect(
      hasActiveExamFoundingPremium({
        examPracticePremiumExpiresAt: now - 1,
        now,
      })
    ).toBe(false);
    const resolved = resolveExamPracticeSessionCount({
      requested: 500,
      courseSlug: "exam-ad-ii",
      bankSize: 200,
      examPracticePremiumExpiresAt: now - 1,
      now,
    });
    expect(resolved.premiumAccess).toBe(false);
    expect(resolved.count).toBe(EXAM_PRACTICE_FREE_QUESTION_COUNT);
  });

  it("extends from current founding expiry without shortening", () => {
    const current = now + FOUNDING_MEMBERS_ACCESS_DURATION_MS;
    const next = nextExamFoundingPremiumExpiry({
      now,
      currentExpiresAt: current,
    });
    expect(next).toBe(current + FOUNDING_MEMBERS_ACCESS_DURATION_MS);
  });

  it("leaves subscription / credit-pack premium paths intact", () => {
    expect(
      hasExamPracticePremiumAccess({
        subscriptionActive: true,
        now,
      })
    ).toBe(true);
    expect(
      hasExamPracticePremiumAccess({
        hasPurchasedCredits: true,
        now,
      })
    ).toBe(true);
    expect(
      hasExamPracticePremiumAccess({
        credits: 999,
        now,
      })
    ).toBe(false);
  });
});

describe("Founding Members Paystack / Convex wiring (source)", () => {
  const paystack = readFileSync(resolve(ROOT, "convex/paystack.ts"), "utf8");
  const founding = readFileSync(
    resolve(ROOT, "convex/foundingMembersOffer.ts"),
    "utf8"
  );
  const schema = readFileSync(resolve(ROOT, "convex/schema.ts"), "utf8");
  const card = readFileSync(
    resolve(ROOT, "web/components/gigalearn/exam/FoundingMembersOfferCard.tsx"),
    "utf8"
  );
  const centre = readFileSync(
    resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
    "utf8"
  );

  it("registers exam_founding_premium product and fulfilment path", () => {
    expect(schema).toContain('v.literal("exam_founding_premium")');
    expect(paystack).toContain("FOUNDING_MEMBERS_PRODUCT_ID");
    expect(paystack).toContain("exam_founding_premium");
    expect(paystack).toContain("fulfillFoundingMembersPurchase");
    expect(paystack).toContain("reserveSlotForCheckout");
    expect(paystack).toContain('currency: "GHS"');
  });

  it("never trusts client price / allocation — server constants only", () => {
    expect(founding).toContain("FOUNDING_MEMBERS_PRICE_GHS");
    expect(founding).toContain("FOUNDING_MEMBERS_MAX_ALLOCATIONS");
    expect(founding).toContain("isFoundingMembersOfferLive");
    expect(founding).toContain('FOUNDING_MEMBERS_OFFER_LIVE');
    expect(card).not.toMatch(/amountGhs:\s*\d+/);
  });

  it("gates live checkout and shows sold-out / already-premium UI", () => {
    expect(card).toContain("Unlock Premium for GHS");
    expect(card).toContain("founding-members-sold-out");
    expect(card).toContain("founding-members-already-premium");
    expect(card).toContain("founding-members-remaining");
    expect(card).toContain("liveCheckoutEnabled");
    expect(centre).toContain("FoundingMembersOfferCard");
  });

  it("webhook fulfilment stays amount-validated and idempotent", () => {
    expect(paystack).toContain("validatePaymentAmount(record");
    expect(paystack).toContain("alreadyFulfilled: true");
    expect(founding).toContain("alreadyFulfilled: true");
    expect(paystack).toContain("verifyPaystackSignature");
  });

  it("releases reservations on failed payment and expires abandoned checkouts", () => {
    expect(paystack).toContain("releaseReservationByReference");
    expect(founding).toContain("expireAbandonedReservations");
    expect(founding).toContain("reservation_expired");
  });

  it("keeps expired reservations claimable for late Paystack webhooks", () => {
    // Stale reserved → expired (identity kept), then reclaim after grace TTL.
    expect(founding).toContain('status: "expired"');
    expect(founding).toContain("reclaimExpiredSlotsToOpen");
    expect(founding).toContain("grace for late webhooks");
    expect(founding).toMatch(/slot\.status === "reserved"/);
    expect(founding).toMatch(/slot\.status === "expired"/);
    expect(founding).toMatch(/slot\.status === "failed"/);
  });

  it("defaults live checkout off until FOUNDING_MEMBERS_OFFER_LIVE=true", () => {
    expect(founding).toContain(
      'return process.env.FOUNDING_MEMBERS_OFFER_LIVE?.trim() === "true"'
    );
    expect(founding).toContain(
      "Founding Members offer is not live yet"
    );
  });

  it("rejects amount mismatches before entitlement grant", () => {
    expect(founding).toContain("Founding Members amount mismatch");
    expect(founding).toContain("args.amountGhs !== FOUNDING_MEMBERS_PRICE_GHS");
    expect(paystack).toContain("payment_amount_mismatch");
  });

  it("admin audit requires admin session credentials", () => {
    expect(founding).toContain("adminOfferAudit");
    expect(founding).toContain("ensureAdminAccess");
    expect(founding).toContain("adminCredentialArgs");
  });

  it("does not expose Paystack secrets in the client card", () => {
    expect(card).not.toMatch(/sk_live_|sk_test_|PAYSTACK_SECRET/);
    expect(card).toContain("initializePayment");
  });
});

describe("Founding Members concurrent final-seat model", () => {
  it("models concurrent last-seat contention as remaining zero after one paid + one reserved", () => {
    // Two checkouts race for the last seat: one reserved, one would see 0 remaining.
    const afterFirstReserve = computeRemainingAllocations({
      maxAllocations: 30,
      paidCount: 29,
      reservedActiveCount: 1,
    });
    expect(afterFirstReserve).toBe(0);
  });
});
