/**
 * Teacher Promotion True/False — import shape, grading, shuffle skip, filters.
 */
import { describe, expect, it } from "vitest";
import {
  buildSessionOptionPermutations,
  getTechBankQuestionById,
  getTechBankQuestions,
  gradeTechAnswers,
  isTrueFalseQuestion,
  presentTechQuestion,
  selectTechQuestionIds,
  toPublicTechQuestion,
} from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
import { getExamBankMeta } from "../../web/lib/gigalearn/examPractice/examBankMeta";
import {
  PROMOTION_RANK_BANK_SUMMARIES,
  PROMOTION_RANK_BANKS_TOTAL,
} from "../../web/lib/gigalearn/examPractice/centreConfig";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");

describe("promotion True/False bank import", () => {
  it("imports AD II True/False items with provenance and review status", () => {
    const tfs = getTechBankQuestions("exam-ad-ii", { questionType: "true_false" });
    expect(tfs.length).toBe(54);
    const fromAd2 = tfs.filter((q) => /AD2_28TH_FEB_2023/i.test(q.sourceDocument ?? ""));
    const fromGuide = tfs.filter((q) => /550_guide_deduped/i.test(q.sourceDocument ?? ""));
    expect(fromAd2.length).toBe(25);
    expect(fromGuide.length).toBe(29);
    for (const q of tfs) {
      expect(q.questionType).toBe("true_false");
      expect(q.options).toEqual(["True", "False"]);
      expect(q.optionIds).toHaveLength(2);
      expect([0, 1]).toContain(q.correctIndex);
      expect(q.correctOptionId).toBe(q.optionIds?.[q.correctIndex]);
      expect(q.reviewStatus).toBe("pending_review");
      expect(q.verificationStatus).toBe("awaiting_verification");
      expect(q.verificationNotes).toMatch(/SOURCE ANSWER/i);
      expect(q.sourceDocument).toMatch(/AD2_28TH_FEB_2023|550_guide_deduped/i);
      expect(q.promotionRank).toBe("assistant-director-ii");
      expect(q.questionText.length).toBeGreaterThan(20);
    }
    const trueKeys = tfs.filter((q) => q.correctIndex === 0).length;
    const falseKeys = tfs.filter((q) => q.correctIndex === 1).length;
    expect(trueKeys).toBeGreaterThan(0);
    expect(falseKeys).toBeGreaterThan(0);
  });

  it("imports teacher-promotion True/False with unconfirmed rank from mock sources", () => {
    const tfs = getTechBankQuestions("exam-teacher-promotion", {
      questionType: "true_false",
    });
    expect(tfs.length).toBe(57);
    for (const q of tfs) {
      expect(q.questionType).toBe("true_false");
      expect(q.options).toEqual(["True", "False"]);
      expect(q.reviewStatus).toBe("pending_review");
      expect(q.verificationStatus).toBe("awaiting_verification");
      // Rank not assigned from subject relevance alone.
      expect(q.promotionRank == null || q.promotionRank === "").toBe(true);
      expect(q.sourceDocument).toMatch(/Benito|AUGUST|2024|2025/i);
    }
  });

  it("does not present answer keys on the public question shape", () => {
    const q = getTechBankQuestions("exam-ad-ii", { questionType: "true_false" })[0]!;
    const pub = toPublicTechQuestion(q);
    expect(pub.questionType).toBe("true_false");
    expect(pub).not.toHaveProperty("correctIndex");
    expect(pub).not.toHaveProperty("explanation");
    expect(pub).not.toHaveProperty("correctOptionId");
    expect(pub.options).toEqual(["True", "False"]);
  });
});

describe("promotion True/False scoring", () => {
  it("grades TRUE and FALSE answer keys for correct and incorrect selections", () => {
    const tfs = getTechBankQuestions("exam-ad-ii", { questionType: "true_false" });
    const trueKey = tfs.find((q) => q.correctIndex === 0)!;
    const falseKey = tfs.find((q) => q.correctIndex === 1)!;
    expect(trueKey).toBeTruthy();
    expect(falseKey).toBeTruthy();

    const trueCorrect = gradeTechAnswers({
      courseSlug: "exam-ad-ii",
      questionIds: [trueKey.questionId],
      answers: { [trueKey.questionId]: 0 },
    });
    expect(trueCorrect.score).toBe(1);
    expect(trueCorrect.results[0]?.correct).toBe(true);

    const trueWrong = gradeTechAnswers({
      courseSlug: "exam-ad-ii",
      questionIds: [trueKey.questionId],
      answers: { [trueKey.questionId]: 1 },
    });
    expect(trueWrong.score).toBe(0);
    expect(trueWrong.results[0]?.correct).toBe(false);

    const falseCorrect = gradeTechAnswers({
      courseSlug: "exam-ad-ii",
      questionIds: [falseKey.questionId],
      answers: { [falseKey.questionId]: 1 },
    });
    expect(falseCorrect.score).toBe(1);

    const falseWrong = gradeTechAnswers({
      courseSlug: "exam-ad-ii",
      questionIds: [falseKey.questionId],
      answers: { [falseKey.questionId]: 0 },
    });
    expect(falseWrong.score).toBe(0);
  });

  it("treats unanswered True/False items as incorrect without inventing a selection", () => {
    const q = getTechBankQuestions("exam-ad-ii", { questionType: "true_false" })[0]!;
    const graded = gradeTechAnswers({
      courseSlug: "exam-ad-ii",
      questionIds: [q.questionId],
      answers: {},
    });
    expect(graded.score).toBe(0);
    expect(graded.results[0]?.selectedIndex).toBeNull();
    expect(graded.maxScore).toBe(1);
  });

  it("does not award duplicate credit when the same answer is graded twice", () => {
    const q = getTechBankQuestions("exam-ad-ii", { questionType: "true_false" })[0]!;
    const answers = { [q.questionId]: q.correctIndex };
    const once = gradeTechAnswers({
      courseSlug: "exam-ad-ii",
      questionIds: [q.questionId],
      answers,
    });
    const twice = gradeTechAnswers({
      courseSlug: "exam-ad-ii",
      questionIds: [q.questionId],
      answers,
    });
    expect(once.score).toBe(1);
    expect(twice.score).toBe(1);
    expect(twice.maxScore).toBe(1);
  });

  it("restores identity permutations for True/False (no shuffle)", () => {
    const tfs = getTechBankQuestions("exam-ad-ii", { questionType: "true_false" }).slice(
      0,
      5
    );
    const perms = buildSessionOptionPermutations(
      tfs.map((q) => ({
        questionId: q.questionId,
        options: q.options,
        questionType: q.questionType,
      })),
      99
    );
    for (const q of tfs) {
      expect(isTrueFalseQuestion(q)).toBe(true);
      expect(perms[q.questionId]).toEqual([0, 1]);
      const presented = presentTechQuestion(q, perms[q.questionId]);
      expect(presented.options).toEqual(["True", "False"]);
      const graded = gradeTechAnswers({
        courseSlug: "exam-ad-ii",
        questionIds: [q.questionId],
        answers: { [q.questionId]: q.correctIndex },
        optionPermutations: perms,
      });
      expect(graded.score).toBe(1);
    }
  });

  it("still shuffles MCQ options while leaving True/False fixed in mixed sessions", () => {
    const mcq = getTechBankQuestions("exam-ad-ii", { questionType: "mcq" })[0]!;
    const tf = getTechBankQuestions("exam-ad-ii", { questionType: "true_false" })[0]!;
    const perms = buildSessionOptionPermutations(
      [
        {
          questionId: mcq.questionId,
          options: mcq.options,
          questionType: mcq.questionType,
        },
        {
          questionId: tf.questionId,
          options: tf.options,
          questionType: tf.questionType,
        },
      ],
      12345
    );
    expect(perms[tf.questionId]).toEqual([0, 1]);
    expect(perms[mcq.questionId]).toHaveLength(4);
    // With a non-trivial seed, MCQ permutation is usually non-identity.
    // Identity is allowed but then display order still grades correctly.
    const graded = gradeTechAnswers({
      courseSlug: "exam-ad-ii",
      questionIds: [mcq.questionId, tf.questionId],
      answers: {
        [mcq.questionId]: perms[mcq.questionId]!.indexOf(mcq.correctIndex),
        [tf.questionId]: tf.correctIndex,
      },
      optionPermutations: perms,
    });
    expect(graded.score).toBe(2);
  });
});

describe("promotion True/False filtering and honest rank availability", () => {
  it("filters selection pools by question type", () => {
    const tfIds = selectTechQuestionIds({
      courseSlug: "exam-ad-ii",
      mode: "practice_test",
      count: 500,
      seed: 7,
      premiumAccess: true,
      questionType: "true_false",
    });
    expect(tfIds.length).toBe(54);
    for (const id of tfIds) {
      expect(getTechBankQuestionById("exam-ad-ii", id)?.questionType).toBe("true_false");
    }

    const mcqIds = selectTechQuestionIds({
      courseSlug: "exam-ad-ii",
      mode: "practice_test",
      count: 500,
      seed: 7,
      premiumAccess: true,
      questionType: "mcq",
    });
    expect(mcqIds.length).toBe(241);

    const adITf = selectTechQuestionIds({
      courseSlug: "exam-ad-i",
      mode: "practice_test",
      count: 50,
      seed: 1,
      premiumAccess: true,
      questionType: "true_false",
    });
    expect(adITf.length).toBe(29);
  });

  it("exposes honest per-rank MCQ / True-False availability on the centre config", () => {
    const adIi = PROMOTION_RANK_BANK_SUMMARIES.find((b) => b.id === "ad-ii")!;
    expect(adIi.mcqCount).toBe(241);
    expect(adIi.trueFalseCount).toBe(54);
    expect(adIi.questionTypes).toEqual(["mcq", "true_false"]);
    expect(adIi.trueFalseHref).toContain("qtype=true_false");
    expect(adIi.guidePdfHref).toContain("GigaLearn_AD_II_550_Questions_Answers.pdf");

    for (const bank of PROMOTION_RANK_BANK_SUMMARIES) {
      expect(bank.trueFalseCount).toBeGreaterThan(0);
      expect(bank.questionTypes).toEqual(["mcq", "true_false"]);
      expect(bank.trueFalseHref).toContain("qtype=true_false");
      expect(bank.guidePdfHref).toMatch(/_550_Questions_Answers\.pdf$/);
    }

    expect(PROMOTION_RANK_BANKS_TOTAL.published).toBe(1419);
    expect(getExamBankMeta("exam-ad-ii")?.trueFalseCount).toBe(54);
    expect(getExamBankMeta("exam-teacher-promotion")?.trueFalseCount).toBe(57);
  });

  it("wires Convex questionType arg and TechHub True/False presentation", () => {
    const convex = readFileSync(
      resolve(ROOT, "convex/gigaLearnTechBanks.ts"),
      "utf8"
    );
    expect(convex).toContain('v.literal("true_false")');
    expect(convex).toContain("questionType");
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/TechHubPractice.tsx"),
      "utf8"
    );
    expect(ui).toContain("exam-session-tf");
    expect(ui).toContain("true_false");
    expect(ui).toContain("rewardForIncorrectAnswer");
    const css = readFileSync(resolve(ROOT, "web/styles/globals.css"), "utf8");
    expect(css).toContain(".exam-session-tf");
    expect(css).toContain("exam-session-options--true-false");
  });
});
