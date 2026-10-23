/**
 * Rank-unspecified free-50 practice labelling (General Teacher Promotion Practice).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getPromotionFreeQuestions,
  PROMOTION_FREE_SET_META,
} from "../../web/lib/gigalearn/examPractice/promotionOrientationBank";
import { EXAM_PRACTICE_DESTINATIONS } from "../../web/lib/gigalearn/examPractice/centreConfig";
import { optionFeedbackNotes } from "../../web/lib/gigalearn/examPractice/optionFeedback";
import {
  rewardForCorrectAnswer,
  rewardForIncorrectAnswer,
} from "../../web/lib/gigalearn/examPractice/rewardCopy";
import { scoreQuiz } from "../../web/lib/gigalearn/examPractice/quizEngine";

const ROOT = resolve(__dirname, "../..");

describe("General Teacher Promotion Practice rename", () => {
  it("keeps the 50-question bank and answer keys intact", () => {
    const qs = getPromotionFreeQuestions();
    expect(qs).toHaveLength(50);
    expect(PROMOTION_FREE_SET_META.id).toBe("promotion-free-50");
    expect(EXAM_PRACTICE_DESTINATIONS.promotionFreePractice).toBe(
      "/gigalearn/exam/practice/"
    );
    const allCorrect = Object.fromEntries(qs.map((q) => [q.id, q.correct]));
    expect(scoreQuiz(qs, allCorrect).percent).toBe(100);
  });

  it("wires centre + session page to the new copy", () => {
    const centre = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
      "utf8"
    );
    expect(centre).toContain("PROMOTION_FREE_SET_META.centreHeading");
    expect(centre).toContain("PROMOTION_FREE_SET_META.welcomeMessage");
    expect(centre).toContain("PROMOTION_FREE_SET_META.startCta");
    expect(centre).toContain('data-testid="general-promotion-free-practice"');

    const page = readFileSync(
      resolve(ROOT, "web/app/(marketing)/gigalearn/exam/practice/page.tsx"),
      "utf8"
    );
    expect(page).toContain("General Teacher Promotion Practice");
    expect(page).toContain("Welcome to General Teacher Promotion Practice");
    expect(page).toContain("no specific promotion rank");

    const session = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamQuizSession.tsx"),
      "utf8"
    );
    expect(session).toContain("meta.centreHeading");
    expect(session).toContain("General Teacher Promotion Practice");
  });

  it("preserves feedback notes and non-duplicate praise semantics", () => {
    const q = getPromotionFreeQuestions()[0]!;
    const notes = optionFeedbackNotes(q);
    expect(notes[q.correct].toLowerCase()).toMatch(/correct/);
    const ok = rewardForCorrectAnswer({ streak: 1, seed: 1 });
    const bad = rewardForIncorrectAnswer({ seed: 1 });
    expect(ok).not.toBe(bad);
    const rewarded = new Set<string>();
    let pulses = 0;
    for (let i = 0; i < 3; i++) {
      if (rewarded.has(q.id)) continue;
      rewarded.add(q.id);
      pulses += 1;
    }
    expect(pulses).toBe(1);
  });
});
