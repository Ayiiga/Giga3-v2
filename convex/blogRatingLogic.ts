/** Pure helpers for blog article star ratings (1–5 integers). */

export const BLOG_RATING_MIN = 1;
export const BLOG_RATING_MAX = 5;
export const BLOG_CLIENT_ID_MIN = 8;
export const BLOG_CLIENT_ID_MAX = 128;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;

/** Accept only whole-number ratings from 1 through 5. */
export function normalizeBlogRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < BLOG_RATING_MIN || value > BLOG_RATING_MAX) return null;
  return value;
}

/** Stable anonymous voter id from the browser (localStorage). */
export function normalizeBlogClientId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (id.length < BLOG_CLIENT_ID_MIN || id.length > BLOG_CLIENT_ID_MAX) return null;
  if (!CLIENT_ID_PATTERN.test(id)) return null;
  if (id === "server") return null;
  return id;
}

export type BlogRatingAggregate = {
  ratingSum: number;
  ratingCount: number;
  ratingAvg: number;
};

/** Genuine average rounded to one decimal; zeros when there are no ratings. */
export function computeBlogRatingAggregate(
  ratingSum: number,
  ratingCount: number
): BlogRatingAggregate {
  if (
    !Number.isFinite(ratingSum) ||
    !Number.isFinite(ratingCount) ||
    ratingCount <= 0 ||
    ratingSum <= 0
  ) {
    return { ratingSum: 0, ratingCount: 0, ratingAvg: 0 };
  }
  const avg = ratingSum / ratingCount;
  return {
    ratingSum,
    ratingCount,
    ratingAvg: Math.round(avg * 10) / 10,
  };
}

/**
 * Apply a new or replacement rating to running totals.
 * When `previous` is set, the voter is updating an existing submission.
 */
export function applyBlogRatingDelta(args: {
  ratingSum: number;
  ratingCount: number;
  next: number;
  previous?: number | null;
}): BlogRatingAggregate {
  let sum = args.ratingSum;
  let count = args.ratingCount;
  if (args.previous != null) {
    sum = sum - args.previous + args.next;
  } else {
    sum += args.next;
    count += 1;
  }
  return computeBlogRatingAggregate(sum, count);
}
