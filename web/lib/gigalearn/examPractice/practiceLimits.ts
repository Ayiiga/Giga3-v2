/**
 * Exam Practice session sizes and entitlement rules.
 *
 * Free orientation / entry practice stays small. Larger packs ("premium
 * version") unlock with:
 * - any **active paid subscription** — Basic (GHS 60), Pro (GHS 150), or
 *   Premium (GHS 350) — via `subscriptionActive`, OR
 * - a credit-pack purchase (`hasPurchasedCredits` / AI `isPremium` tier).
 *
 * Basic is intentionally included: GHS 60 subscribers get full exam packs and
 * premium-tier question stems, not only Pro/Premium plan holders.
 *
 * Important: a residual credit *balance* alone does NOT unlock premium packs.
 * There is no `CREDIT_COSTS` entry for exam practice sessions — do not invent
 * per-session prices or silently spend wallet credits here.
 */

export const EXAM_PRACTICE_FREE_QUESTION_COUNT = 50;
export const EXAM_PRACTICE_PREMIUM_QUESTION_COUNT = 500;

/** Lowest paid catalog plan that unlocks Exam Practice premium packs. */
export const EXAM_PRACTICE_MIN_PAID_PLAN_GHS = 60;

/** Short UI copy — keep in sync with subscriptionPlans.basic.priceGhs. */
export const EXAM_PRACTICE_PAID_UNLOCK_COPY =
  "Basic (GHS 60) and higher, or a credit-pack purchase";

/** Soft cap for Technology Hub non-exam courses (unchanged UX). */
export const TECH_HUB_DEFAULT_MAX_COUNT = 50;

/**
 * Max concurrent in-progress Exam Practice sessions per user+course.
 * Starting a new session abandons prior open ones (prevents pile-up abuse).
 */
export const EXAM_PRACTICE_MAX_CONCURRENT_IN_PROGRESS = 1;

export function isExamPracticeCourseSlug(courseSlug: string): boolean {
  const slug = courseSlug.trim().toLowerCase();
  return slug.startsWith("exam-");
}

export type ExamPracticeEntitlementInput = {
  /** Active paid plan with unexpired subscriptionExpiresAt. */
  subscriptionActive?: boolean | null;
  /** AI / product premium tier (subscription or credit-pack purchase). */
  isPremium?: boolean | null;
  /** True when creditLogs contain a credit_purchase — not residual balance. */
  hasPurchasedCredits?: boolean | null;
  /**
   * Residual wallet balance. Kept for call-site compatibility only —
   * MUST NOT grant premium exam packs by itself.
   */
  credits?: number | null;
};

/**
 * Server + client gate for Exam Practice premium packs / premium-only stems.
 * `subscriptionActive` must be true for Basic, Pro, or Premium with a future
 * `subscriptionExpiresAt` (see `isSubscriptionActive` in creditsConfig).
 */
export function hasExamPracticePremiumAccess(
  args: ExamPracticeEntitlementInput
): boolean {
  // Any active paid plan (including Basic / GHS 60) unlocks premium packs.
  if (args.subscriptionActive) return true;
  if (args.isPremium) return true;
  if (args.hasPurchasedCredits) return true;
  // Intentionally ignore args.credits — balance ≠ entitlement.
  return false;
}

export function maxPracticeQuestionCount(args: {
  courseSlug?: string;
  premiumAccess: boolean;
}): number {
  if (args.courseSlug && isExamPracticeCourseSlug(args.courseSlug)) {
    return args.premiumAccess
      ? EXAM_PRACTICE_PREMIUM_QUESTION_COUNT
      : EXAM_PRACTICE_FREE_QUESTION_COUNT;
  }
  return TECH_HUB_DEFAULT_MAX_COUNT;
}

export function clampPracticeQuestionCount(args: {
  requested: number;
  courseSlug?: string;
  premiumAccess: boolean;
  bankSize?: number;
}): number {
  const hardMax = maxPracticeQuestionCount(args);
  const bankCap =
    typeof args.bankSize === "number" && args.bankSize > 0
      ? args.bankSize
      : hardMax;
  const n = Math.floor(args.requested);
  if (!Number.isFinite(n)) {
    return Math.min(EXAM_PRACTICE_FREE_QUESTION_COUNT, hardMax, bankCap);
  }
  return Math.max(1, Math.min(hardMax, bankCap, n));
}

/**
 * Pure entitlement → session size resolution used by Convex and unit tests.
 * Free callers requesting 500 are clamped to 50 (no error leak).
 */
export function resolveExamPracticeSessionCount(args: {
  requested: number;
  courseSlug: string;
  bankSize: number;
  subscriptionActive?: boolean | null;
  isPremium?: boolean | null;
  hasPurchasedCredits?: boolean | null;
  credits?: number | null;
}): {
  premiumAccess: boolean;
  count: number;
  freeCap: number;
  premiumCap: number;
} {
  const premiumAccess = hasExamPracticePremiumAccess(args);
  const count = clampPracticeQuestionCount({
    requested: args.requested,
    courseSlug: args.courseSlug,
    premiumAccess,
    bankSize: args.bankSize,
  });
  return {
    premiumAccess,
    count,
    freeCap: EXAM_PRACTICE_FREE_QUESTION_COUNT,
    premiumCap: Math.min(
      EXAM_PRACTICE_PREMIUM_QUESTION_COUNT,
      Math.max(0, args.bankSize)
    ),
  };
}

/** Whether starting a new exam session should close prior in-progress ones. */
export function shouldAbandonPriorExamInProgress(courseSlug: string): boolean {
  return isExamPracticeCourseSlug(courseSlug);
}
