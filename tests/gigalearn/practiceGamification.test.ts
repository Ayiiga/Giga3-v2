import { describe, expect, it } from "vitest";
import {
  computeAnswerStreak,
  masteryLabel,
  sessionBadges,
} from "../../web/lib/gigalearn/practiceGamification";

describe("GigaLearn practice gamification", () => {
  it("computes answer streak from recent results", () => {
    expect(
      computeAnswerStreak([
        { correct: true },
        { correct: true },
        { correct: false },
        { correct: true },
      ])
    ).toBe(1);
    expect(
      computeAnswerStreak([
        { correct: true },
        { correct: true },
        { correct: true },
      ])
    ).toBe(3);
  });

  it("labels mastery without overstating", () => {
    expect(masteryLabel(90)).toBe("Strong");
    expect(masteryLabel(55)).toBe("Practicing");
  });

  it("awards session badges for streaks and personal bests", () => {
    const badges = sessionBadges({
      score: 90,
      streak: 4,
      mode: "mission",
      isNewBest: true,
    });
    expect(badges.some((b) => b.id === "streak")).toBe(true);
    expect(badges.some((b) => b.id === "personal_best")).toBe(true);
  });
});
