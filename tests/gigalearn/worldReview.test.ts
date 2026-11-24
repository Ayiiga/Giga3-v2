// @vitest-environment happy-dom
import { beforeEach, expect, it } from "vitest";
import { loadWorldReview, nextWorldReview, saveWorldReview, type WorldReview } from "../../web/lib/gigalearn/worldReview";
import { worldCheck } from "../../web/lib/gigalearn/worldChecks";

const day = 86_400_000;
const independent = { correct: true, usedHint: false };

beforeEach(() => localStorage.clear());

it("advances review spacing only after independent recall at or after the due date", () => {
  let prior: WorldReview | null = null;
  let now = 20 * day;
  for (const [stage, interval] of [1, 3, 7, 14, 30, 30].entries()) {
    const review: WorldReview = nextWorldReview(prior, independent, now);
    expect(review).toMatchObject({ stage: Math.min(stage, 4), dueAt: now + interval * day });
    expect(nextWorldReview(review, independent, review.dueAt - 1)).toEqual(review);
    prior = review;
    now = review.dueAt;
  }
});

it("returns to immediate practice after a miss or hint and switches the example", () => {
  const prior = nextWorldReview(null, independent, 0);
  for (const result of [{ correct: true, usedHint: true }, { correct: false, usedHint: false }]) {
    const review = nextWorldReview(prior, result, day);
    expect(review).toMatchObject({ stage: -1, dueAt: day, nextVariant: 0 });
    expect(worldCheck("foundation", review.nextVariant).prompt).not.toBe(
      worldCheck("foundation", prior.nextVariant).prompt,
    );
  }
});

it("persists only the specified account and learning world and ignores malformed stored data", () => {
  const review = nextWorldReview(null, independent, 0);
  expect(saveWorldReview("first@example.com", "foundation", review)).toBe(true);
  expect(loadWorldReview("first@example.com", "foundation")).toEqual(review);
  expect(loadWorldReview("second@example.com", "foundation")).toBeNull();
  expect(loadWorldReview("first@example.com", "mastery")).toBeNull();
  localStorage.setItem(localStorage.key(0)!, "{\"stage\":99}");
  expect(loadWorldReview("first@example.com", "foundation")).toBeNull();
});
