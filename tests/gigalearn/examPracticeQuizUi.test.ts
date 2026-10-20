/**
 * Exam Practice quiz UI — free promotion orientation bank + session chrome.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getPromotionFreeQuestions,
  PROMOTION_FREE_SET_META,
} from "../../web/lib/gigalearn/examPractice/promotionOrientationBank";
import { EXAM_PRACTICE_DESTINATIONS } from "../../web/lib/gigalearn/examPractice/centreConfig";
import { scoreQuiz } from "../../web/lib/gigalearn/examPractice/quizEngine";

const ROOT = resolve(__dirname, "../..");

describe("Teacher Promotion free practice bank", () => {
  it("ships exactly 30 orientation questions with A–D options and explanations", () => {
    const qs = getPromotionFreeQuestions();
    expect(PROMOTION_FREE_SET_META.questionCount).toBe(30);
    expect(qs).toHaveLength(30);
    expect(PROMOTION_FREE_SET_META.provenanceNote.toLowerCase()).toMatch(/not an official/);
    for (const q of qs) {
      expect(q.options.A && q.options.B && q.options.C && q.options.D).toBeTruthy();
      expect(["A", "B", "C", "D"]).toContain(q.correct);
      expect(q.explanation.length).toBeGreaterThan(12);
      expect(q.stem.toLowerCase()).not.toContain("momo");
    }
  });

  it("scores all-correct and mixed answers without inventing totals", () => {
    const qs = getPromotionFreeQuestions();
    const allCorrect = Object.fromEntries(qs.map((q) => [q.id, q.correct]));
    expect(scoreQuiz(qs, allCorrect)).toEqual({
      correct: 30,
      answered: 30,
      total: 30,
      percent: 100,
    });
    const none = scoreQuiz(qs, {});
    expect(none.answered).toBe(0);
    expect(none.correct).toBe(0);
    expect(none.percent).toBe(0);
  });
});

describe("Exam Practice quiz UI wiring", () => {
  it("deep-links free practice without MoMo activation paths", () => {
    expect(EXAM_PRACTICE_DESTINATIONS.promotionFreePractice).toBe("/gigalearn/exam/practice/");
    expect(EXAM_PRACTICE_DESTINATIONS.credits).toBe("/credits/");
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
      "utf8"
    );
    expect(ui).toContain("Start Free 30 Questions");
    expect(ui).toContain("promotionFreePractice");
    expect(ui).toContain("exam-ghana-stripe");
    expect(ui).toContain("Paystack");
    expect(ui.toLowerCase()).not.toContain("0248");
    expect(ui.toLowerCase()).not.toContain("copy momo");
    expect(ui.toLowerCase()).not.toContain("whatsapp sir");
  });

  it("ships timed quiz session page and component", () => {
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/exam/practice/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(resolve(ROOT, "web/components/gigalearn/exam/ExamQuizSession.tsx"))
    ).toBe(true);
    const session = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamQuizSession.tsx"),
      "utf8"
    );
    expect(session).toContain("Time left");
    expect(session).toContain("Explanation:");
    expect(session).toContain("exam-session-option--correct");
    expect(session).toContain("exam-session-option--wrong");
    expect(session).toContain("Previous");
    expect(session).toContain("Next");
  });

  it("keeps BECE centre free of promotion question stems", () => {
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
      "utf8"
    );
    const beceBlock = ui.slice(
      ui.indexOf("function BeceCentreCard"),
      ui.indexOf("function TeacherPromotionCentreCard")
    );
    expect(beceBlock).toContain("bece-practice-ready");
    expect(beceBlock).not.toContain("PROMOTION_FREE");
    expect(beceBlock).not.toContain("Start Free 30");
    expect(beceBlock).not.toContain("Benito");
  });
});
