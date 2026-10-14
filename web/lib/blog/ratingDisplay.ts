/** Client-safe display helpers mirroring convex/blogRatingLogic aggregates. */

export type BlogRatingDisplay = {
  ratingSum: number;
  ratingCount: number;
  ratingAvg: number;
  /** True when at least one real rating exists — never invent stars. */
  hasRatings: boolean;
};

export function computeBlogRatingAggregate(
  ratingSum: number,
  ratingCount: number
): Omit<BlogRatingDisplay, "hasRatings"> {
  if (
    !Number.isFinite(ratingSum) ||
    !Number.isFinite(ratingCount) ||
    ratingCount <= 0 ||
    ratingSum <= 0
  ) {
    return { ratingSum: 0, ratingCount: 0, ratingAvg: 0 };
  }
  return {
    ratingSum,
    ratingCount,
    ratingAvg: Math.round((ratingSum / ratingCount) * 10) / 10,
  };
}

export function toBlogRatingDisplay(
  ratingSum: number,
  ratingCount: number
): BlogRatingDisplay {
  const agg = computeBlogRatingAggregate(ratingSum, ratingCount);
  return { ...agg, hasRatings: agg.ratingCount > 0 };
}

export function formatBlogRatingLabel(avg: number, count: number): string {
  if (count <= 0) return "No ratings yet";
  const stars = count === 1 ? "rating" : "ratings";
  return `${avg.toFixed(1)} out of 5 · ${count} ${stars}`;
}

export function normalizeBlogRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < 1 || value > 5) return null;
  return value;
}
