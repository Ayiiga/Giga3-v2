/**
 * Five GES promotion rank banks — honest 550 distinct practice items per rank.
 * Items remain pending_review / original_practice (not official GES papers).
 */
import { describe, expect, it } from "vitest";
import {
  getTechBankQuestionById,
  getTechBankQuestions,
  isTechQuestionAccessible,
  listLoadedTechBankSlugs,
  selectTechQuestionIds,
  toPublicTechQuestion,
} from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
import { getBuiltinAcademyCourse } from "../../web/lib/gigalearn/academy/courseCatalog";
import { getExamBankMeta } from "../../web/lib/gigalearn/examPractice/examBankMeta";
import {
  PROMOTION_RANK_BANKS_TOTAL,
  PROMOTION_RANK_BANK_SUMMARIES,
  EXAM_PRACTICE_DESTINATIONS,
} from "../../web/lib/gigalearn/examPractice/centreConfig";
import { resolveExamPracticeSessionCount } from "../../web/lib/gigalearn/examPractice/practiceLimits";

const RANK_SLUGS = [
  "exam-ad-ii",
  "exam-ad-i",
  "exam-deputy-director",
  "exam-director-ii",
  "exam-director-i",
] as const;

describe("promotion rank banks inventory", () => {
  it("loads five separate rank banks with 550 distinct published items each", () => {
    for (const slug of RANK_SLUGS) {
      expect(listLoadedTechBankSlugs()).toContain(slug);
      const qs = getTechBankQuestions(slug);
      expect(qs.length).toBe(550);
      expect(getExamBankMeta(slug)?.pendingQuestionCount).toBe(550);
      expect(getExamBankMeta(slug)?.approvedQuestionCount).toBe(0);
      expect(getBuiltinAcademyCourse(slug)?.category).toBe("Exam prep");
    }
    expect(PROMOTION_RANK_BANKS_TOTAL.published).toBe(2750);
    expect(PROMOTION_RANK_BANKS_TOTAL.target).toBe(2750);
    expect(PROMOTION_RANK_BANKS_TOTAL.gap).toBe(0);
  });

  it("meets the 550 distinct target without claiming official GES verification", () => {
    for (const bank of PROMOTION_RANK_BANK_SUMMARIES) {
      expect(bank.publishedCount).toBe(550);
      expect(bank.targetCount).toBe(550);
      expect(bank.gapToTarget).toBe(0);
      expect(bank.approvedCount).toBe(0);
      expect(bank.pendingCount).toBe(550);
      expect(bank.guidePdfHref).toMatch(/_\d+_Practice_Questions_Answers\.pdf$/);
    }
  });

  it("ships MCQs with stable option ids and no answer key in public shape", () => {
    for (const slug of RANK_SLUGS) {
      const qs = getTechBankQuestions(slug, { questionType: "mcq" });
      expect(qs.length).toBeGreaterThan(0);
      for (const q of qs) {
        expect(q.questionType).toBe("mcq");
        expect(q.options).toHaveLength(4);
        expect(q.optionIds?.length).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
        expect(q.correctOptionId).toBe(q.optionIds?.[q.correctIndex]);
        expect(q.verificationStatus).toBe("awaiting_verification");
        expect(q.reviewStatus).toBe("pending_review");
        expect(q.sourceType).toBe("original_practice");
        const pub = toPublicTechQuestion(q);
        expect(pub).not.toHaveProperty("correctIndex");
        expect(pub).not.toHaveProperty("explanation");
        expect(pub).not.toHaveProperty("correctOptionId");
        expect(pub.questionType).toBe("mcq");
      }
    }
  });
});

describe("promotion rank free / premium entitlement gate", () => {
  it("excludes premium-only stems from free selection pools", () => {
    const freePool = getTechBankQuestions("exam-ad-ii", { freeTierOnly: true });
    expect(freePool.length).toBeGreaterThanOrEqual(100);
    expect(freePool.every((q) => isTechQuestionAccessible(q, false))).toBe(true);

    const freeIds = selectTechQuestionIds({
      courseSlug: "exam-ad-ii",
      mode: "practice_test",
      count: 500,
      seed: 42,
      premiumAccess: false,
    });
    // Free entitlement clamps selection to 50 even when the free pool is larger.
    expect(freeIds.length).toBe(50);
    for (const id of freeIds) {
      const q = getTechBankQuestionById("exam-ad-ii", id)!;
      expect(q.accessTier).toContain("free");
      expect(q.accessTier).not.toContain("premium");
    }

    const premiumIds = selectTechQuestionIds({
      courseSlug: "exam-ad-ii",
      mode: "practice_test",
      count: 500,
      seed: 42,
      premiumAccess: true,
    });
    expect(premiumIds.length).toBe(500);
    expect(
      premiumIds.some((id) => {
        const q = getTechBankQuestionById("exam-ad-ii", id)!;
        return (q.accessTier || []).includes("premium");
      })
    ).toBe(true);
  });

  it("clamps free sessions to free pool size without leaking premium count as bankSize", () => {
    const freeBank = getTechBankQuestions("exam-ad-ii", { freeTierOnly: true }).length;
    const resolved = resolveExamPracticeSessionCount({
      requested: 500,
      courseSlug: "exam-ad-ii",
      bankSize: freeBank,
      subscriptionActive: false,
      hasPurchasedCredits: false,
      credits: 999,
    });
    expect(resolved.premiumAccess).toBe(false);
    expect(resolved.count).toBe(50);
  });
});

describe("promotion rank centre destinations", () => {
  it("deep-links each rank into learn-mode tech practice", () => {
    expect(EXAM_PRACTICE_DESTINATIONS.adIiPractice).toContain("exam-ad-ii");
    expect(EXAM_PRACTICE_DESTINATIONS.adIiPractice).toContain("mode=learn");
    expect(EXAM_PRACTICE_DESTINATIONS.adIPractice).toContain("exam-ad-i");
    expect(EXAM_PRACTICE_DESTINATIONS.deputyDirectorPractice).toContain(
      "exam-deputy-director"
    );
    expect(EXAM_PRACTICE_DESTINATIONS.directorIiPractice).toContain("exam-director-ii");
    expect(EXAM_PRACTICE_DESTINATIONS.directorIPractice).toContain("exam-director-i");
    expect(EXAM_PRACTICE_DESTINATIONS.promotionRankSelect).toBe(
      "/gigalearn/exam/promotion/"
    );
  });
});
