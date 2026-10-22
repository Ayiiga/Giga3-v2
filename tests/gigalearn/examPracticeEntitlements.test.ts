/**
 * Exam Practice entitlement + clamp rules — release-readiness cases.
 * Residual credit balance must NOT unlock premium packs; no invented prices.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREDIT_COSTS,
} from "../../convex/creditsConfig";
import {
  EXAM_PRACTICE_FREE_QUESTION_COUNT,
  EXAM_PRACTICE_MAX_CONCURRENT_IN_PROGRESS,
  EXAM_PRACTICE_PREMIUM_QUESTION_COUNT,
  clampPracticeQuestionCount,
  hasExamPracticePremiumAccess,
  resolveExamPracticeSessionCount,
  shouldAbandonPriorExamInProgress,
} from "../../web/lib/gigalearn/examPractice/practiceLimits";
import {
  getTechBankQuestions,
  selectTechQuestionIds,
} from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
import { examPracticeShareUrl } from "../../web/lib/gigalearn/examPractice/sharePractice";

const ROOT = resolve(__dirname, "../..");

describe("Exam practice billing policy (no invented prices)", () => {
  it("has no CREDIT_COSTS entry for exam practice sessions", () => {
    expect(CREDIT_COSTS).toEqual({
      chat: 1,
      writing: 2,
      research: 3,
      image: 2,
      video: 9,
    });
    expect(CREDIT_COSTS).not.toHaveProperty("exam");
    expect(CREDIT_COSTS).not.toHaveProperty("exam_practice");
    expect(CREDIT_COSTS).not.toHaveProperty("practice");
  });

  it("documents server entitlement without residual-balance unlock", () => {
    const convex = readFileSync(
      resolve(ROOT, "convex/gigaLearnTechBanks.ts"),
      "utf8"
    );
    expect(convex).toContain("resolveExamPracticeSessionCount");
    expect(convex).toContain("hasPurchasedCredits");
    expect(convex).toContain("credit_purchase");
    expect(convex).toContain("shouldAbandonPriorExamInProgress");
    // Must not treat balance > 0 as premiumAccess directly.
    expect(convex).not.toMatch(/credits:\s*user\?\.credits[\s\S]{0,80}isPremium:\s*false/);
  });
});

describe("hasExamPracticePremiumAccess entitlement matrix", () => {
  it("denies free users with zero credits", () => {
    expect(
      hasExamPracticePremiumAccess({
        subscriptionActive: false,
        credits: 0,
        hasPurchasedCredits: false,
        isPremium: false,
      })
    ).toBe(false);
  });

  it("denies leftover balance of one credit without purchase or subscription", () => {
    expect(
      hasExamPracticePremiumAccess({
        subscriptionActive: false,
        credits: 1,
        hasPurchasedCredits: false,
        isPremium: false,
      })
    ).toBe(false);
  });

  it("denies large residual balance without purchase or subscription", () => {
    expect(
      hasExamPracticePremiumAccess({
        subscriptionActive: false,
        credits: 999,
        hasPurchasedCredits: false,
      })
    ).toBe(false);
  });

  it("denies expired subscription without credit-pack purchase", () => {
    expect(
      hasExamPracticePremiumAccess({
        subscriptionActive: false,
        isPremium: false,
        hasPurchasedCredits: false,
        credits: 50,
      })
    ).toBe(false);
  });

  it("allows active subscription even with zero credits", () => {
    expect(
      hasExamPracticePremiumAccess({
        subscriptionActive: true,
        credits: 0,
        hasPurchasedCredits: false,
      })
    ).toBe(true);
  });

  it("allows credit-pack purchase history (hasPurchasedCredits) with zero balance", () => {
    expect(
      hasExamPracticePremiumAccess({
        subscriptionActive: false,
        credits: 0,
        hasPurchasedCredits: true,
      })
    ).toBe(true);
  });

  it("allows isPremium tier (subscription or pack purchase)", () => {
    expect(
      hasExamPracticePremiumAccess({
        subscriptionActive: false,
        credits: 0,
        isPremium: true,
      })
    ).toBe(true);
  });

  it("treats insufficient/zero credits as irrelevant when not purchased", () => {
    for (const credits of [0, 1, 2, null, undefined]) {
      expect(
        hasExamPracticePremiumAccess({
          subscriptionActive: false,
          hasPurchasedCredits: false,
          credits,
        })
      ).toBe(false);
    }
  });
});

describe("resolveExamPracticeSessionCount free / premium / bank caps", () => {
  const beceBank = 468;
  const promoBank = 239;

  it("clamps free users requesting 500 down to 50", () => {
    const r = resolveExamPracticeSessionCount({
      requested: 500,
      courseSlug: "exam-bece-prep",
      bankSize: beceBank,
      subscriptionActive: false,
      credits: 0,
    });
    expect(r.premiumAccess).toBe(false);
    expect(r.count).toBe(EXAM_PRACTICE_FREE_QUESTION_COUNT);
  });

  it("clamps free users with leftover credits requesting 500 down to 50", () => {
    const r = resolveExamPracticeSessionCount({
      requested: 500,
      courseSlug: "exam-teacher-promotion",
      bankSize: promoBank,
      subscriptionActive: false,
      credits: 1,
      hasPurchasedCredits: false,
    });
    expect(r.premiumAccess).toBe(false);
    expect(r.count).toBe(50);
  });

  it("allows active subscription up to bank size (not beyond 500)", () => {
    const r = resolveExamPracticeSessionCount({
      requested: 500,
      courseSlug: "exam-bece-prep",
      bankSize: beceBank,
      subscriptionActive: true,
    });
    expect(r.premiumAccess).toBe(true);
    expect(r.count).toBe(beceBank);
    expect(r.count).toBeLessThanOrEqual(EXAM_PRACTICE_PREMIUM_QUESTION_COUNT);
  });

  it("allows credit-pack purchase up to bank size", () => {
    const r = resolveExamPracticeSessionCount({
      requested: 500,
      courseSlug: "exam-teacher-promotion",
      bankSize: promoBank,
      hasPurchasedCredits: true,
      credits: 0,
    });
    expect(r.premiumAccess).toBe(true);
    expect(r.count).toBe(promoBank);
  });

  it("never exceeds bank size even when premium and requesting 500", () => {
    expect(
      clampPracticeQuestionCount({
        requested: 500,
        courseSlug: "exam-bece-prep",
        premiumAccess: true,
        bankSize: 100,
      })
    ).toBe(100);
  });

  it("never exceeds 500 even if bank is larger", () => {
    expect(
      clampPracticeQuestionCount({
        requested: 999,
        courseSlug: "exam-bece-prep",
        premiumAccess: true,
        bankSize: 2000,
      })
    ).toBe(500);
  });

  it("keeps free sessions at most 50 regardless of bank size", () => {
    expect(
      clampPracticeQuestionCount({
        requested: 200,
        courseSlug: "exam-bece-prep",
        premiumAccess: false,
        bankSize: 2000,
      })
    ).toBe(50);
  });

  it("selectTechQuestionIds respects hard max after entitlement clamp", () => {
    const freeCount = resolveExamPracticeSessionCount({
      requested: 500,
      courseSlug: "exam-bece-prep",
      bankSize: beceBank,
      subscriptionActive: false,
    }).count;
    const ids = selectTechQuestionIds({
      courseSlug: "exam-bece-prep",
      mode: "practice_test",
      count: freeCount,
      seed: 11,
    });
    expect(ids.length).toBe(freeCount);
    expect(ids.length).toBeLessThanOrEqual(50);
  });
});

describe("concurrent session / duplicate-start policy", () => {
  it("limits concurrent in-progress exam sessions to 1 and abandons priors", () => {
    expect(EXAM_PRACTICE_MAX_CONCURRENT_IN_PROGRESS).toBe(1);
    expect(shouldAbandonPriorExamInProgress("exam-bece-prep")).toBe(true);
    expect(shouldAbandonPriorExamInProgress("exam-teacher-promotion")).toBe(true);
    expect(shouldAbandonPriorExamInProgress("website-pwa-development")).toBe(false);
  });

  it("wires abandon-prior into startTechPracticeSession", () => {
    const start = readFileSync(
      resolve(ROOT, "convex/gigaLearnTechBanks.ts"),
      "utf8"
    );
    const block = start.slice(
      start.indexOf("export const startTechPracticeSession"),
      start.indexOf("export const getTechPracticeSession")
    );
    expect(block).toContain("shouldAbandonPriorExamInProgress");
    expect(block).toContain('status: "submitted"');
    expect(block).toContain("in_progress");
  });

  it("duplicate premium requests resolve to the same clamped size (idempotent size)", () => {
    const a = resolveExamPracticeSessionCount({
      requested: 500,
      courseSlug: "exam-bece-prep",
      bankSize: 468,
      subscriptionActive: true,
    });
    const b = resolveExamPracticeSessionCount({
      requested: 500,
      courseSlug: "exam-bece-prep",
      bankSize: 468,
      subscriptionActive: true,
    });
    expect(a.count).toBe(b.count);
    expect(a.premiumAccess).toBe(b.premiumAccess);
  });
});

describe("share UTM + answer-key hygiene", () => {
  it("keeps Teacher Promotion and BECE share UTMs", () => {
    expect(examPracticeShareUrl("teacher_promotion")).toContain(
      "utm_campaign=teacher-promotion"
    );
    expect(examPracticeShareUrl("bece")).toContain("utm_campaign=bece-practice");
  });

  it("start session returns public questions without keys", () => {
    const start = readFileSync(
      resolve(ROOT, "convex/gigaLearnTechBanks.ts"),
      "utf8"
    );
    const block = start.slice(
      start.indexOf("export const startTechPracticeSession"),
      start.indexOf("export const getTechPracticeSession")
    );
    expect(block).toContain("presentTechQuestion");
    expect(block).toContain("optionPermutationsJson");
    expect(block).not.toContain("correctIndex:");
    expect(block).not.toContain("explanation:");
  });

  it("free session selection never returns premium-only AD II stems", () => {
    const freeIds = new Set(
      selectTechQuestionIds({
        courseSlug: "exam-ad-ii",
        mode: "practice_test",
        count: 500,
        seed: 42,
        premiumAccess: false,
      })
    );
    const premiumOnly = getTechBankQuestions("exam-ad-ii").filter(
      (q) =>
        Array.isArray(q.accessTier) &&
        q.accessTier.includes("premium") &&
        !q.accessTier.includes("free")
    );
    expect(premiumOnly.length).toBeGreaterThan(0);
    for (const q of premiumOnly) {
      expect(freeIds.has(q.questionId)).toBe(false);
    }
    expect(freeIds.size).toBeLessThanOrEqual(EXAM_PRACTICE_FREE_QUESTION_COUNT);
  });
});
