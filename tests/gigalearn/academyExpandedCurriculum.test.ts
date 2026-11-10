import { describe, expect, it } from "vitest";
import courses from "../../web/public/gigalearn/academy/workspace/courses.mjs";
import { eligibleForCertificate, passingScore, readProgress } from "../../web/public/gigalearn/academy/workspace/progress.mjs";

describe("expanded Academy curriculum", () => {
  it("provides ten distinct lessons and ten valid assessment questions per track", () => {
    expect(courses).toHaveLength(6);
    for (const course of courses) {
      expect(course.lessons).toHaveLength(10);
      expect(new Set(course.lessons.map(([title]) => title)).size).toBe(10);
      expect(course.quiz).toHaveLength(10);
      expect(passingScore(course)).toBe(8);
      for (const [, options, answer, explanation] of course.quiz) {
        expect(options[Number(answer)]).toBeTruthy();
        expect(explanation).toBeTruthy();
      }
    }
  });

  it("carries forward completed lessons and original certificates separately", () => {
    const course = courses[0];
    const earned = "2026-11-10T03:22:00.000Z";
    const migrated = readProgress(course, { done: [0, 1, 2], best: 4, earned });
    expect(migrated).toMatchObject({
      done: [0, 1, 2], introductoryBest: 4, introductoryEarned: earned, best: 0, earned: "",
    });
    expect(readProgress(course, migrated)).toEqual(migrated);
    expect(eligibleForCertificate(course, migrated)).toBe(false);
    const done = course.lessons.map((_, i) => i);
    expect(eligibleForCertificate(course, { ...migrated, done, best: 7 })).toBe(false);
    expect(eligibleForCertificate(course, { ...migrated, done: done.slice(1), best: 8 })).toBe(false);
    expect(eligibleForCertificate(course, { ...migrated, done, best: 8 })).toBe(true);
  });
});
