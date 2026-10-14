import { describe, expect, it } from "vitest";
import {
  applyBlogRatingDelta,
  computeBlogRatingAggregate,
  normalizeBlogClientId,
  normalizeBlogRating,
} from "../../convex/blogRatingLogic";

describe("normalizeBlogRating", () => {
  it("accepts integers 1 through 5 only", () => {
    expect(normalizeBlogRating(1)).toBe(1);
    expect(normalizeBlogRating(5)).toBe(5);
    expect(normalizeBlogRating(3)).toBe(3);
  });

  it("rejects floats, out-of-range, and non-numbers", () => {
    expect(normalizeBlogRating(3.5)).toBeNull();
    expect(normalizeBlogRating(0)).toBeNull();
    expect(normalizeBlogRating(6)).toBeNull();
    expect(normalizeBlogRating("5")).toBeNull();
    expect(normalizeBlogRating(NaN)).toBeNull();
  });
});

describe("normalizeBlogClientId", () => {
  it("accepts stable browser ids", () => {
    expect(normalizeBlogClientId("c_12345678")).toBe("c_12345678");
    expect(normalizeBlogClientId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    );
  });

  it("rejects short, empty, or server placeholder ids", () => {
    expect(normalizeBlogClientId("short")).toBeNull();
    expect(normalizeBlogClientId("server")).toBeNull();
    expect(normalizeBlogClientId("bad id!")).toBeNull();
  });
});

describe("computeBlogRatingAggregate / applyBlogRatingDelta", () => {
  it("returns zeros when there are no ratings (never invents averages)", () => {
    expect(computeBlogRatingAggregate(0, 0)).toEqual({
      ratingSum: 0,
      ratingCount: 0,
      ratingAvg: 0,
    });
  });

  it("computes genuine averages to one decimal", () => {
    expect(computeBlogRatingAggregate(14, 3)).toEqual({
      ratingSum: 14,
      ratingCount: 3,
      ratingAvg: 4.7,
    });
  });

  it("adds a first rating and updates an existing voter without double-counting", () => {
    const first = applyBlogRatingDelta({
      ratingSum: 0,
      ratingCount: 0,
      next: 5,
    });
    expect(first).toEqual({ ratingSum: 5, ratingCount: 1, ratingAvg: 5 });

    const updated = applyBlogRatingDelta({
      ratingSum: first.ratingSum,
      ratingCount: first.ratingCount,
      next: 3,
      previous: 5,
    });
    expect(updated).toEqual({ ratingSum: 3, ratingCount: 1, ratingAvg: 3 });

    const secondVoter = applyBlogRatingDelta({
      ratingSum: updated.ratingSum,
      ratingCount: updated.ratingCount,
      next: 5,
    });
    expect(secondVoter).toEqual({ ratingSum: 8, ratingCount: 2, ratingAvg: 4 });
  });
});
