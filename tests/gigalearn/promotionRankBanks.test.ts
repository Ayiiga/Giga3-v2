/**
 * Five GES promotion rank banks — honest counts, entitlements, no fake 500 verified.
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

const EXPECTED_COUNTS: Record<(typeof RANK_SLUGS)[number], number> = {
  "exam-ad-ii": 60,
  "exam-ad-i": 56,
  "exam-deputy-director": 50,
  "exam-director-ii": 47,
  "exam-director-i": 46,
};

describe("promotion rank banks inventory", () => {
  it("loads five separate rank banks with honest published counts", () => {
    for (const slug of RANK_SLUGS) {
      expect(listLoadedTechBankSlugs()).toContain(slug);
      const qs = getTechBankQuestions(slug);
      expect(qs.length).toBe(EXPECTED_COUNTS[slug]);
      expect(getExamBankMeta(slug)?.pendingQuestionCount).toBe(EXPECTED_COUNTS[slug]);
      expect(getExamBankMeta(slug)?.approvedQuestionCount).toBe(0);
      expect(getBuiltinAcademyCourse(slug)?.category).toBe("Exam prep");
    }
    const total = RANK_SLUGS.reduce((n, s) => n + EXPECTED_COUNTS[s], 0);
    expect(total).toBe(259);
    expect(PROMOTION_RANK_BANKS_TOTAL.published).toBe(259);
    expect(PROMOTION_RANK_BANKS_TOTAL.target).toBe(2500);
    expect(PROMOTION_RANK_BANKS_TOTAL.gap).toBe(2241);
  });

  it("does not claim 500 verified items per rank", () => {
    for (const bank of PROMOTION_RANK_BANK_SUMMARIES) {
      expect(bank.publishedCount).toBeLessThan(500);
      expect(bank.gapToTarget).toBeGreaterThan(0);
      expect(bank.approvedCount).toBe(0);
      expect(bank.pendingCount).toBe(bank.publishedCount);
    }
  });

  it("ships MCQs with stable option ids and no answer key in public shape", () => {
    for (const slug of RANK_SLUGS) {
      const qs = getTechBankQuestions(slug);
      for (const q of qs) {
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
      }
    }
  });
});

describe("promotion rank free / premium entitlement gate", () => {
  it("excludes premium-only stems from free selection pools", () => {
    const freePool = getTechBankQuestions("exam-ad-ii", { freeTierOnly: true });
    expect(freePool.length).toBe(50);
    expect(freePool.every((q) => isTechQuestionAccessible(q, false))).toBe(true);

    const freeIds = selectTechQuestionIds({
      courseSlug: "exam-ad-ii",
      mode: "practice_test",
      count: 500,
      seed: 42,
      premiumAccess: false,
    });
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
    expect(premiumIds.length).toBe(60);
    expect(premiumIds.some((id) => id === "exam-ad-ii-q051")).toBe(true);
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
  it("deep-links each rank into the shared tech practice surface", () => {
    expect(EXAM_PRACTICE_DESTINATIONS.adIiPractice).toContain("exam-ad-ii");
    expect(EXAM_PRACTICE_DESTINATIONS.adIPractice).toContain("exam-ad-i");
    expect(EXAM_PRACTICE_DESTINATIONS.deputyDirectorPractice).toContain(
      "exam-deputy-director"
    );
    expect(EXAM_PRACTICE_DESTINATIONS.directorIiPractice).toContain("exam-director-ii");
    expect(EXAM_PRACTICE_DESTINATIONS.directorIPractice).toContain("exam-director-i");
  });
});
