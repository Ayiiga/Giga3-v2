/**
 * Exam Practice — free/premium limits, reward copy, shareable promo links.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clampPracticeQuestionCount,
  EXAM_PRACTICE_FREE_QUESTION_COUNT,
  EXAM_PRACTICE_PREMIUM_QUESTION_COUNT,
  hasExamPracticePremiumAccess,
  isExamPracticeCourseSlug,
  maxPracticeQuestionCount,
} from "../../web/lib/gigalearn/examPractice/practiceLimits";
import {
  rewardForCorrectAnswer,
  rewardForSessionScore,
} from "../../web/lib/gigalearn/examPractice/rewardCopy";
import {
  examPracticeShareText,
  examPracticeShareUrl,
} from "../../web/lib/gigalearn/examPractice/sharePractice";
import {
  getPromotionFreeQuestions,
  PROMOTION_FREE_SET_META,
} from "../../web/lib/gigalearn/examPractice/promotionOrientationBank";

const ROOT = resolve(__dirname, "../..");

describe("Exam practice question limits", () => {
  it("treats exam-* slugs as exam practice courses", () => {
    expect(isExamPracticeCourseSlug("exam-bece-prep")).toBe(true);
    expect(isExamPracticeCourseSlug("exam-teacher-promotion")).toBe(true);
    expect(isExamPracticeCourseSlug("website-pwa-development")).toBe(false);
  });

  it("caps free learners at 50 and premium at 500 for exam packs", () => {
    expect(EXAM_PRACTICE_FREE_QUESTION_COUNT).toBe(50);
    expect(EXAM_PRACTICE_PREMIUM_QUESTION_COUNT).toBe(500);
    expect(
      maxPracticeQuestionCount({
        courseSlug: "exam-bece-prep",
        premiumAccess: false,
      })
    ).toBe(50);
    expect(
      maxPracticeQuestionCount({
        courseSlug: "exam-teacher-promotion",
        premiumAccess: true,
      })
    ).toBe(500);
    expect(
      clampPracticeQuestionCount({
        requested: 500,
        courseSlug: "exam-bece-prep",
        premiumAccess: false,
        bankSize: 468,
      })
    ).toBe(50);
    expect(
      clampPracticeQuestionCount({
        requested: 500,
        courseSlug: "exam-bece-prep",
        premiumAccess: true,
        bankSize: 468,
      })
    ).toBe(468);
  });

  it("grants premium for subscription or credit-pack purchase — not residual balance", () => {
    expect(hasExamPracticePremiumAccess({ subscriptionActive: true })).toBe(true);
    expect(hasExamPracticePremiumAccess({ hasPurchasedCredits: true })).toBe(true);
    expect(hasExamPracticePremiumAccess({ isPremium: true })).toBe(true);
    expect(hasExamPracticePremiumAccess({ credits: 5, subscriptionActive: false })).toBe(
      false
    );
    expect(hasExamPracticePremiumAccess({ credits: 0, subscriptionActive: false })).toBe(
      false
    );
  });
});

describe("Exam practice rewards", () => {
  it("returns praise lines including Excellent and Superb", () => {
    const lines = new Set(
      Array.from({ length: 24 }, (_, i) =>
        rewardForCorrectAnswer({ streak: 1, seed: i })
      )
    );
    expect([...lines].some((l) => /excellent/i.test(l))).toBe(true);
    expect([...lines].some((l) => /superb/i.test(l))).toBe(true);
    expect(rewardForCorrectAnswer({ streak: 3 })).toMatch(/superb/i);
    expect(rewardForSessionScore(92)).toMatch(/outstanding/i);
    expect(rewardForSessionScore(40)).toMatch(/keep practising/i);
  });
});

describe("Exam practice share links", () => {
  it("builds absolute Teacher Promotion and BECE share URLs with campaign tags", () => {
    const promo = examPracticeShareUrl("teacher_promotion");
    const bece = examPracticeShareUrl("bece");
    expect(promo).toContain("/gigalearn/exam/promotion/");
    expect(promo).toContain("utm_campaign=teacher-promotion");
    expect(promo).not.toContain("#teacher-promotion-centre");
    expect(bece).toContain("utm_campaign=bece-practice");
    expect(bece).toContain("#bece-centre");
    expect(examPracticeShareText("teacher_promotion")).toMatch(/not an official/i);
    expect(examPracticeShareText("bece")).toMatch(/not an official/i);
  });
});

describe("Free orientation bank + UI wiring for 50 / share / rewards", () => {
  it("ships exactly 50 free orientation questions", () => {
    const qs = getPromotionFreeQuestions();
    expect(PROMOTION_FREE_SET_META.questionCount).toBe(50);
    expect(qs).toHaveLength(50);
    expect(PROMOTION_FREE_SET_META.id).toBe("promotion-free-50");
  });

  it("wires centre CTAs, share buttons, and reward CSS", () => {
    const centre = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
      "utf8"
    );
    expect(centre).toMatch(/Start [Ff]ree \{EXAM_PRACTICE_FREE_QUESTION_COUNT\} [Qq]uestions/);
    expect(centre).toContain("promotionRankSelect");
    expect(centre).toContain("Choose rank · Start Free Practice");
    expect(centre).toContain("ExamPracticeShareButton");
    expect(centre).toContain('kind="bece"');
    expect(centre).toContain('kind="teacher_promotion"');
    expect(centre).toContain("becePracticeFull");
    expect(centre).toContain("teacherPromotionPracticeFull");

    const session = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamQuizSession.tsx"),
      "utf8"
    );
    expect(session).toContain("rewardForCorrectAnswer");
    expect(session).toContain('data-testid="exam-reward"');
    expect(session).toContain("ExamPracticeShareButton");
    expect(session).toContain("recordLocalExamPracticeResult");

    const css = readFileSync(resolve(ROOT, "web/styles/globals.css"), "utf8");
    expect(css).toContain(".exam-session-reward");

    const convex = readFileSync(resolve(ROOT, "convex/gigaLearnTechBanks.ts"), "utf8");
    expect(convex).toContain("resolveExamPracticeSessionCount");
    expect(convex).toContain("hasPurchasedCredits");
    expect(convex).toContain("shouldAbandonPriorExamInProgress");
  });
});
