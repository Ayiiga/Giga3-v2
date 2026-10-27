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
  it("ships exactly 50 orientation questions with A–D options and explanations", () => {
    const qs = getPromotionFreeQuestions();
    expect(PROMOTION_FREE_SET_META.questionCount).toBe(50);
    expect(qs).toHaveLength(50);
    expect(PROMOTION_FREE_SET_META.provenanceNote.toLowerCase()).toMatch(/not an official/);
    for (const q of qs) {
      expect(q.options.A && q.options.B && q.options.C && q.options.D).toBeTruthy();
      expect(["A", "B", "C", "D"]).toContain(q.correct);
      expect(q.explanation.length).toBeGreaterThan(12);
      expect(q.stem.toLowerCase()).not.toContain("momo");
    }
  });

  it("labels the free set as general practice with no specific promotion rank", () => {
    expect(PROMOTION_FREE_SET_META.centreHeading).toBe(
      "General Teacher Promotion Practice"
    );
    expect(PROMOTION_FREE_SET_META.title).toBe(
      "General Teacher Promotion Practice — Free 50 Questions"
    );
    expect(PROMOTION_FREE_SET_META.subtitle).toMatch(
      /50 general teacher promotion preparation questions/i
    );
    expect(PROMOTION_FREE_SET_META.startCta).toBe("Start General Practice");
    expect(PROMOTION_FREE_SET_META.welcomeMessage).toBe(
      "Welcome to General Teacher Promotion Practice"
    );
    expect(PROMOTION_FREE_SET_META.freeLabel).toMatch(
      /no specific promotion rank selected/i
    );
    expect(PROMOTION_FREE_SET_META.provenanceNote).toBe(
      "GigaLearn orientation practice — not an official Ghana Education Service examination paper."
    );
    // Must not imply a rank assignment.
    const blob = [
      PROMOTION_FREE_SET_META.title,
      PROMOTION_FREE_SET_META.centreHeading,
      PROMOTION_FREE_SET_META.welcomeMessage,
      PROMOTION_FREE_SET_META.freeLabel,
    ].join(" ");
    expect(blob).not.toMatch(/Assistant Director|Deputy Director|Director I{1,2}\b/i);
  });

  it("scores all-correct and mixed answers without inventing totals", () => {
    const qs = getPromotionFreeQuestions();
    const allCorrect = Object.fromEntries(qs.map((q) => [q.id, q.correct]));
    expect(scoreQuiz(qs, allCorrect)).toEqual({
      correct: 50,
      answered: 50,
      total: 50,
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
    expect(ui).toMatch(/Start [Ff]ree \{EXAM_PRACTICE_FREE_QUESTION_COUNT\} [Qq]uestions/);
    expect(ui).toContain("promotionRankSelect");
    expect(ui).toContain("Choose rank · Start Free Practice");
    expect(ui).toContain("promotionFreePractice");
    expect(ui).toContain("general-promotion-free-practice");
    expect(ui).toContain("exam-ghana-stripe");
    expect(ui).toContain("Paystack");
    expect(ui).not.toContain("Start Free {EXAM_PRACTICE_FREE_QUESTION_COUNT} Questions");
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
    expect(session).toContain("Correct answer:");
    expect(session).toContain("exam-session-option--correct");
    expect(session).toContain("exam-session-option--wrong");
    expect(session).toContain("Previous");
    expect(session).toContain("Next");
    expect(session).toContain("rewardForCorrectAnswer");
    const root = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeSessionRoot.tsx"),
      "utf8"
    );
    expect(root).toContain("buildShuffledFreePractice");
    expect(root).toContain("loadFreePracticeDraft");
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
