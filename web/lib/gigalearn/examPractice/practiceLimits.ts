/**
 * Exam Practice session sizes.
 * Free orientation / entry practice stays small; subscription or purchased
 * credits unlock larger server-graded packs (capped by bank availability).
 */

export const EXAM_PRACTICE_FREE_QUESTION_COUNT = 50;
export const EXAM_PRACTICE_PREMIUM_QUESTION_COUNT = 500;

/** Soft cap for Technology Hub non-exam courses (unchanged UX). */
export const TECH_HUB_DEFAULT_MAX_COUNT = 50;

export function isExamPracticeCourseSlug(courseSlug: string): boolean {
  const slug = courseSlug.trim().toLowerCase();
  return slug.startsWith("exam-");
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
  if (!Number.isFinite(n)) return Math.min(EXAM_PRACTICE_FREE_QUESTION_COUNT, hardMax);
  return Math.max(1, Math.min(hardMax, bankCap, n));
}

export function hasExamPracticePremiumAccess(args: {
  subscriptionActive?: boolean | null;
  credits?: number | null;
  isPremium?: boolean | null;
}): boolean {
  if (args.subscriptionActive) return true;
  if (args.isPremium) return true;
  if (typeof args.credits === "number" && args.credits > 0) return true;
  return false;
}
