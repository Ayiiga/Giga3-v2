/**
 * GigaLearn Teacher Promotion Premium — Founding Members offer (config + pure helpers).
 *
 * Price / inventory are fixed server-side. Live checkout is gated by Convex env
 * `FOUNDING_MEMBERS_OFFER_LIVE=true` so production cannot charge until approved.
 *
 * Access duration matches the existing subscription period (30 days). That value
 * is explicit here for product approval — do not invent a different duration
 * without updating this constant and the Convex mirror.
 */

import {
  EXAM_PRACTICE_FREE_QUESTION_COUNT,
  EXAM_PRACTICE_PREMIUM_QUESTION_COUNT,
} from "@/lib/gigalearn/examPractice/practiceLimits";

/** Must stay equal to `SUBSCRIPTION_PERIOD_MS` in convex/subscriptionPlans.ts. */
const EXISTING_SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/** Stable product + offer identifiers — never accept client overrides for these. */
export const FOUNDING_MEMBERS_OFFER_ID =
  "gigalearn_teacher_promo_founding_v1" as const;
export const FOUNDING_MEMBERS_PRODUCT_ID =
  "exam_founding_members_premium_v1" as const;

export const FOUNDING_MEMBERS_PRODUCT_NAME =
  "GigaLearn Teacher Promotion Premium — Founding Members";

export const FOUNDING_MEMBERS_PRICE_GHS = 30;
export const FOUNDING_MEMBERS_CURRENCY = "GHS" as const;
export const FOUNDING_MEMBERS_MAX_ALLOCATIONS = 30;

/**
 * Access duration — aligned with existing Basic/Pro/Premium billing period.
 * Report for approval before setting FOUNDING_MEMBERS_OFFER_LIVE=true.
 */
export const FOUNDING_MEMBERS_ACCESS_DURATION_MS = EXISTING_SUBSCRIPTION_PERIOD_MS;
export const FOUNDING_MEMBERS_ACCESS_DURATION_DAYS = 30;
export const FOUNDING_MEMBERS_ACCESS_DURATION_LABEL = "30 days";

/** Abandoned checkout reservation TTL (configurable via Convex env minutes). */
export const FOUNDING_MEMBERS_RESERVATION_TTL_MS_DEFAULT = 30 * 60 * 1000;

export const FOUNDING_MEMBERS_SCOPE_BULLETS = [
  `Full Teacher Promotion practice packs (up to ${EXAM_PRACTICE_PREMIUM_QUESTION_COUNT} items per session, capped by each bank’s published size)`,
  "Rank banks that are already published: AD II, AD I, Deputy Director, Director II, Director I",
  "Learn mode, timed practice, and practice-test modes for Teacher Promotion courses",
  "Immediate feedback on verified keys; provisional keys stay clearly labelled (not claimed as official GES keys)",
  `Does not invent or unlock unpublished/unverified banks beyond what the server already publishes`,
] as const;

export const FOUNDING_MEMBERS_NOT_INCLUDED = [
  "Not an official Ghana Education Service examination paper or certificate",
  "Does not replace Basic/Pro/Premium AI credit subscriptions",
  "Does not claim every rank has 550 questions — published counts vary",
] as const;

export type FoundingAllocationStatus =
  | "open"
  | "reserved"
  | "paid"
  | "expired"
  | "released"
  | "failed";

export type FoundingOfferPublicState = {
  offerId: typeof FOUNDING_MEMBERS_OFFER_ID;
  productId: typeof FOUNDING_MEMBERS_PRODUCT_ID;
  name: typeof FOUNDING_MEMBERS_PRODUCT_NAME;
  priceGhs: typeof FOUNDING_MEMBERS_PRICE_GHS;
  currency: typeof FOUNDING_MEMBERS_CURRENCY;
  maxAllocations: typeof FOUNDING_MEMBERS_MAX_ALLOCATIONS;
  accessDurationDays: typeof FOUNDING_MEMBERS_ACCESS_DURATION_DAYS;
  accessDurationLabel: typeof FOUNDING_MEMBERS_ACCESS_DURATION_LABEL;
  /** False until Convex env FOUNDING_MEMBERS_OFFER_LIVE=true */
  liveCheckoutEnabled: boolean;
  remaining: number;
  paidCount: number;
  reservedActiveCount: number;
  soldOut: boolean;
  viewer: {
    signedIn: boolean;
    alreadyPurchased: boolean;
    hasActivePremiumAccess: boolean;
    examPracticePremiumExpiresAt: number | null;
  };
};

export function foundingMembersPesewas(): number {
  return Math.round(FOUNDING_MEMBERS_PRICE_GHS * 100);
}

export function computeRemainingAllocations(args: {
  maxAllocations: number;
  paidCount: number;
  reservedActiveCount: number;
}): number {
  const used = Math.max(0, args.paidCount) + Math.max(0, args.reservedActiveCount);
  return Math.max(0, args.maxAllocations - used);
}

export function isReservationActive(args: {
  status: FoundingAllocationStatus;
  reservationExpiresAt: number | null | undefined;
  now: number;
}): boolean {
  if (args.status !== "reserved") return false;
  if (args.reservationExpiresAt == null) return false;
  return args.reservationExpiresAt > args.now;
}

export function hasActiveExamFoundingPremium(args: {
  examPracticePremiumExpiresAt?: number | null;
  now: number;
}): boolean {
  const exp = args.examPracticePremiumExpiresAt;
  return typeof exp === "number" && Number.isFinite(exp) && exp > args.now;
}

export function nextExamFoundingPremiumExpiry(args: {
  now: number;
  currentExpiresAt?: number | null;
  durationMs?: number;
}): number {
  const duration = args.durationMs ?? FOUNDING_MEMBERS_ACCESS_DURATION_MS;
  const base = Math.max(args.now, args.currentExpiresAt ?? 0);
  return base + duration;
}

export function foundingOfferIncludesCopy(): string {
  return [
    `GHS ${FOUNDING_MEMBERS_PRICE_GHS}.00 one-time · first ${FOUNDING_MEMBERS_MAX_ALLOCATIONS} eligible purchases`,
    `Access for ${FOUNDING_MEMBERS_ACCESS_DURATION_LABEL} (same period length as existing paid plans)`,
    `Free orientation stays at ${EXAM_PRACTICE_FREE_QUESTION_COUNT} questions without this offer`,
  ].join(". ");
}
