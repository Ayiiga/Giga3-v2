/**
 * Teacher Promotion rank banks — schema, uniqueness, scoring, entitlements, assets.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  buildSessionOptionPermutations,
  getTechBankQuestionById,
  getTechBankQuestions,
  gradeTechAnswers,
  presentTechQuestion,
  selectTechQuestionIds,
  toPublicTechQuestion,
} from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
import {
  PROMOTION_RANK_BANKS_TOTAL,
  PROMOTION_RANK_BANK_SUMMARIES,
} from "../../web/lib/gigalearn/examPractice/centreConfig";

const ROOT = resolve(__dirname, "../..");
const GUIDE_DIR = resolve(ROOT, "web/public/downloads/gigalearn/promotion-guides");

const RANK_SLUGS = [
  "exam-ad-ii",
  "exam-ad-i",
  "exam-deputy-director",
  "exam-director-ii",
  "exam-director-i",
] as const;

const EXPECTED: Record<(typeof RANK_SLUGS)[number], { total: number; mcq: number; tf: number }> =
  {
    "exam-ad-ii": { total: 550, mcq: 447, tf: 103 },
    "exam-ad-i": { total: 550, mcq: 469, tf: 81 },
    "exam-deputy-director": { total: 550, mcq: 466, tf: 84 },
    "exam-director-ii": { total: 550, mcq: 465, tf: 85 },
    "exam-director-i": { total: 550, mcq: 466, tf: 84 },
  };

function normalizeStem(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("promotion bank quality gate", () => {
  it("publishes honest per-rank counts with valid schema and answer keys", () => {
    let total = 0;
    for (const slug of RANK_SLUGS) {
      const qs = getTechBankQuestions(slug);
      const exp = EXPECTED[slug];
      expect(qs.length).toBe(exp.total);
      total += qs.length;
      expect(qs.filter((q) => (q.questionType || "mcq") === "mcq").length).toBe(exp.mcq);
      expect(qs.filter((q) => q.questionType === "true_false").length).toBe(exp.tf);

      const ids = new Set<string>();
      for (const q of qs) {
        expect(ids.has(q.questionId)).toBe(false);
        ids.add(q.questionId);
        expect(q.questionText.trim().length).toBeGreaterThan(10);
        expect(q.reviewStatus).toBe("pending_review");
        expect(q.verificationStatus).toBe("awaiting_verification");
        expect(q.publicationStatus === undefined || q.publicationStatus === "published_practice").toBe(
          true
        );
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctOptionId).toBe(q.optionIds?.[q.correctIndex]);

        if (q.questionType === "true_false") {
          expect(q.options).toEqual(["True", "False"]);
          expect(q.optionIds).toHaveLength(2);
          expect([0, 1]).toContain(q.correctIndex);
        } else {
          expect(q.options).toHaveLength(4);
          expect(q.optionIds).toHaveLength(4);
          expect(q.correctIndex).toBeLessThan(4);
          expect(new Set(q.options.map((o) => normalizeStem(o))).size).toBe(4);
          expect(q.options.every((o) => String(o).trim().length > 0)).toBe(true);
        }

        const pub = toPublicTechQuestion(q);
        expect(pub).not.toHaveProperty("correctIndex");
        expect(pub).not.toHaveProperty("correctOptionId");
        expect(pub).not.toHaveProperty("explanation");
      }
    }
    expect(total).toBe(2750);
    expect(PROMOTION_RANK_BANKS_TOTAL.published).toBe(2750);
    expect(PROMOTION_RANK_BANKS_TOTAL.target).toBe(2750);
    expect(PROMOTION_RANK_BANKS_TOTAL.gap).toBe(0);
  });

  it("has no exact duplicate stems within a rank or across ranks", () => {
    const global = new Map<string, string>();
    for (const slug of RANK_SLUGS) {
      const local = new Set<string>();
      for (const q of getTechBankQuestions(slug)) {
        const key = normalizeStem(q.questionText);
        expect(local.has(key), `${slug} intra-dup ${q.questionId}`).toBe(false);
        local.add(key);
        expect(global.has(key), `cross-rank dup ${slug}/${q.questionId} vs ${global.get(key)}`).toBe(
          false
        );
        global.set(key, `${slug}:${q.questionId}`);
      }
    }
    expect(global.size).toBe(2750);
  });

  it("grades MCQ and True/False correctly with and without option permutations", () => {
    const mcq = getTechBankQuestions("exam-ad-ii", { questionType: "mcq" })[0]!;
    const tf = getTechBankQuestions("exam-ad-ii", { questionType: "true_false" })[0]!;
    const perms = buildSessionOptionPermutations(
      [
        { questionId: mcq.questionId, options: mcq.options, questionType: mcq.questionType },
        { questionId: tf.questionId, options: tf.options, questionType: tf.questionType },
      ],
      42
    );
    expect(perms[tf.questionId]).toEqual([0, 1]);
    const presentedMcq = presentTechQuestion(mcq, perms[mcq.questionId]);
    const displayCorrect = perms[mcq.questionId]!.indexOf(mcq.correctIndex);
    expect(presentedMcq.options[displayCorrect]).toBe(mcq.options[mcq.correctIndex]);

    const graded = gradeTechAnswers({
      courseSlug: "exam-ad-ii",
      questionIds: [mcq.questionId, tf.questionId],
      answers: {
        [mcq.questionId]: displayCorrect,
        [tf.questionId]: tf.correctIndex,
      },
      optionPermutations: perms,
    });
    expect(graded.score).toBe(2);
    expect(graded.maxScore).toBe(2);
  });

  it("keeps free selection clamped and excludes premium-only stems", () => {
    const freeIds = selectTechQuestionIds({
      courseSlug: "exam-ad-ii",
      mode: "practice_test",
      count: 500,
      seed: 11,
      premiumAccess: false,
    });
    expect(freeIds.length).toBe(50);
    for (const id of freeIds) {
      const q = getTechBankQuestionById("exam-ad-ii", id)!;
      expect(q.accessTier).toContain("free");
    }
    const premiumIds = selectTechQuestionIds({
      courseSlug: "exam-director-i",
      mode: "practice_test",
      count: 500,
      seed: 11,
      premiumAccess: true,
    });
    // Premium may request up to 500; bank size is 550 so the session returns 500.
    expect(premiumIds.length).toBe(500);
    expect(premiumIds.length).toBeLessThanOrEqual(550);
  });

  it("wires centre summaries and honest PDF download hrefs to published counts", () => {
    for (const bank of PROMOTION_RANK_BANK_SUMMARIES) {
      expect(bank.publishedCount).toBe(550);
      expect(bank.gapToTarget).toBe(0);
      expect(bank.guidePdfHref).toContain(
        `_${bank.publishedCount}_Practice_Questions_Answers.pdf`
      );
      expect(bank.guidePdfHref).toContain("_550_Practice_Questions_Answers.pdf");
      expect(bank.guidePdfHref).not.toContain("_550_Questions_Answers.pdf");
      const path = resolve(GUIDE_DIR, bank.guidePdfHref!.replace("/downloads/gigalearn/promotion-guides/", ""));
      expect(existsSync(path), path).toBe(true);
      const buf = readFileSync(path);
      expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    }
  });

  it("ZIP contains honest-count PDFs for all five ranks", () => {
    const zipPath = resolve(GUIDE_DIR, "GigaLearn_Teacher_Promotion_Practice_Guides.zip");
    expect(existsSync(zipPath)).toBe(true);
    const listing = execFileSync("unzip", ["-l", zipPath], { encoding: "utf8" });
    for (const bank of PROMOTION_RANK_BANK_SUMMARIES) {
      const file = bank.guidePdfHref!.split("/").pop()!;
      expect(listing).toContain(file);
    }
  });
});
