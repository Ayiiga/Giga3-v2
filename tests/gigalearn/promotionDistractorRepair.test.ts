/**
 * Teacher-promotion bank distractor repair + free-bank quality gates.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getTechBankQuestions,
  gradeTechAnswers,
  presentTechQuestion,
  buildSessionOptionPermutations,
} from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
import {
  getPromotionFreeQuestions,
} from "../../web/lib/gigalearn/examPractice/promotionOrientationBank";
import {
  shuffleExamPracticeSet,
  displayCorrectIndex,
  toOriginalOptionIndex,
} from "../../web/lib/gigalearn/examPractice/optionShuffle";
import { scoreQuiz } from "../../web/lib/gigalearn/examPractice/quizEngine";

const ROOT = resolve(__dirname, "../..");
const GENERIC = new Set([
  "A personal preference without evidence",
  "A record or process unrelated to the question",
  "A decision that ignores professional responsibilities",
  "An action taken without following relevant procedures",
  "Skip the applicable procedure to save time",
  "Make a decision without documenting relevant facts",
  "Transfer the responsibility to an unauthorised person",
  "Ignore evidence and act on personal preference",
]);

describe("teacher-promotion distractor repair", () => {
  const bank = getTechBankQuestions("exam-teacher-promotion", {
    approvedOnly: false,
  });

  it("has no weak_distractors tags remaining", () => {
    const weak = bank.filter((q) => q.tags.includes("weak_distractors"));
    expect(weak).toHaveLength(0);
  });

  it("repaired 179 provisional items and removed generic fillers", () => {
    const repaired = bank.filter((q) => q.tags.includes("distractors_repaired"));
    expect(repaired.length).toBeGreaterThanOrEqual(179);
    const mcqs = bank.filter((q) => (q.questionType || "mcq") === "mcq");
    for (const q of mcqs) {
      for (const opt of q.options) {
        expect(GENERIC.has(opt)).toBe(false);
      }
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
    }
  });

  it("keeps answer-key integrity under option permutations after repair", () => {
    const sample = bank
      .filter((q) => (q.questionType || "mcq") === "mcq")
      .slice(0, 40);
    const perms = buildSessionOptionPermutations(
      sample.map((q) => ({
        questionId: q.questionId,
        options: q.options,
        questionType: q.questionType,
      })),
      4242
    );
    for (const q of sample) {
      const perm = perms[q.questionId]!;
      const presented = presentTechQuestion(q, perm);
      const displayCorrect = displayCorrectIndex(q.correctIndex, perm);
      expect(presented.options[displayCorrect]).toBe(q.options[q.correctIndex]);
      const graded = gradeTechAnswers({
        courseSlug: "exam-teacher-promotion",
        questionIds: [q.questionId],
        answers: { [q.questionId]: displayCorrect },
        optionPermutations: { [q.questionId]: perm },
      });
      expect(graded.score).toBe(1);
      const wrongDisplay = (displayCorrect + 1) % 4;
      expect(toOriginalOptionIndex(wrongDisplay, perm)).not.toBe(q.correctIndex);
      const wrong = gradeTechAnswers({
        courseSlug: "exam-teacher-promotion",
        questionIds: [q.questionId],
        answers: { [q.questionId]: wrongDisplay },
        optionPermutations: { [q.questionId]: perm },
      });
      expect(wrong.score).toBe(0);
    }
  });

  it("keeps uncertain historical items pending; verifies supported legal claims", () => {
    const needs = bank.filter((q) =>
      q.tags.includes("needs_authoritative_verification")
    );
    expect(needs.length).toBe(1);
    expect(needs[0]?.questionId).toBe("exam-teacher-promotion-q008");
    expect(needs[0]?.reviewStatus).toBe("pending_review");
    const verified = bank.filter((q) => q.verificationStatus === "human_verified");
    expect(verified.length).toBe(24);
    const mcqs = bank.filter((q) => (q.questionType || "mcq") === "mcq");
    const tfs = bank.filter((q) => q.questionType === "true_false");
    expect(mcqs.every((q) => (q.optionIds?.length ?? 0) === 4)).toBe(true);
    expect(tfs.every((q) => (q.optionIds?.length ?? 0) === 2)).toBe(true);
    expect(
      bank.every((q) => q.correctOptionId === q.optionIds?.[q.correctIndex])
    ).toBe(true);
  });
});

describe("free orientation bank quality", () => {
  const free = getPromotionFreeQuestions();

  it("has 50 questions with four unique options each", () => {
    expect(free).toHaveLength(50);
    for (const q of free) {
      expect(Object.keys(q.options)).toEqual(["A", "B", "C", "D"]);
      expect(new Set(Object.values(q.options)).size).toBe(4);
      expect(["A", "B", "C", "D"]).toContain(q.correct);
      expect(q.explanation.length).toBeGreaterThan(10);
    }
  });

  it("avoids conspicuous correct-answer length clues", () => {
    let clues = 0;
    for (const q of free) {
      const lens = (["A", "B", "C", "D"] as const).map((l) => q.options[l].length);
      const corrLen = q.options[q.correct].length;
      const others = lens.filter((_, i) => ["A", "B", "C", "D"][i] !== q.correct);
      const second = Math.max(...others);
      if (corrLen === Math.max(...lens) && corrLen >= second + 12) clues += 1;
    }
    expect(clues).toBe(0);
  });

  it("scores correctly after shuffle for all four letters across the set", () => {
    const shuffled = shuffleExamPracticeSet(free, 777);
    const allRight = Object.fromEntries(shuffled.map((q) => [q.id, q.correct]));
    expect(scoreQuiz(shuffled, allRight).correct).toBe(50);
    const seen = new Set(shuffled.map((q) => q.correct));
    // Across 50 shuffled items we expect multiple letters in play.
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});

describe("Convex optionPermutationsJson wiring", () => {
  it("schema and session mutations still carry the field", () => {
    const schema = readFileSync(resolve(ROOT, "convex/schema.ts"), "utf8");
    const convex = readFileSync(resolve(ROOT, "convex/gigaLearnTechBanks.ts"), "utf8");
    expect(schema).toContain("optionPermutationsJson");
    expect(convex).toContain("optionPermutationsJson");
    expect(convex).toContain("buildSessionOptionPermutations");
    expect(convex).toContain("presentTechQuestion");
    expect(convex).toContain("toOriginalOptionIndex");
  });
});
