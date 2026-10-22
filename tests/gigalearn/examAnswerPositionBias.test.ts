/**
 * Answer-position bias — Fisher–Yates shuffle preserves answer-key integrity.
 */
import { describe, expect, it } from "vitest";
import {
  buildSessionOptionPermutations,
  getTechBankQuestions,
  gradeTechAnswers,
  presentTechQuestion,
  selectTechQuestionIds,
} from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
import {
  buildShuffledFreePractice,
  loadFreePracticeDraft,
  saveFreePracticeDraft,
  clearFreePracticeDraft,
} from "../../web/lib/gigalearn/examPractice/freePracticeSession";
import {
  countCorrectLetterDistribution,
  createSeededRng,
  fisherYatesShuffle,
  shuffleExamPracticeQuestion,
  shuffleExamPracticeSet,
  toOriginalOptionIndex,
  displayCorrectIndex,
} from "../../web/lib/gigalearn/examPractice/optionShuffle";
import {
  getPromotionFreeQuestions,
  PROMOTION_FREE_SET_META,
} from "../../web/lib/gigalearn/examPractice/promotionOrientationBank";
import { scoreQuiz } from "../../web/lib/gigalearn/examPractice/quizEngine";
import type { ExamPracticeQuestion } from "../../web/lib/gigalearn/examPractice/types";

function correctText(q: ExamPracticeQuestion): string {
  return q.options[q.correct];
}

describe("Fisher–Yates option shuffle (free promotion bank)", () => {
  it("can place the correct answer in A, B, C, and D across seeds", () => {
    const base = getPromotionFreeQuestions();
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      const shuffled = shuffleExamPracticeSet(base, seed);
      for (const q of shuffled) seen.add(q.correct);
      if (seen.size === 4) break;
    }
    expect([...seen].sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("keeps option texts and the correct identity after shuffle", () => {
    const base = getPromotionFreeQuestions()[0]!;
    const originalCorrect = correctText(base);
    const originalTexts = ["A", "B", "C", "D"].map((l) => base.options[l as "A"]).sort();
    const rand = createSeededRng(99);
    const shuffled = shuffleExamPracticeQuestion(base, rand);
    expect(correctText(shuffled)).toBe(originalCorrect);
    expect(
      ["A", "B", "C", "D"].map((l) => shuffled.options[l as "A"]).sort()
    ).toEqual(originalTexts);
    expect(new Set(Object.values(shuffled.options)).size).toBe(4);
  });

  it("never duplicates or drops an option", () => {
    const base = getPromotionFreeQuestions();
    for (const seed of [1, 7, 42, 99, 12345]) {
      for (const q of shuffleExamPracticeSet(base, seed)) {
        const texts = Object.values(q.options);
        expect(texts).toHaveLength(4);
        expect(new Set(texts).size).toBe(4);
        expect(["A", "B", "C", "D"]).toContain(q.correct);
      }
    }
  });

  it("scores only when the selected letter matches the shuffled key", () => {
    const shuffled = shuffleExamPracticeSet(getPromotionFreeQuestions(), 2026);
    const allCorrect = Object.fromEntries(shuffled.map((q) => [q.id, q.correct]));
    expect(scoreQuiz(shuffled, allCorrect).correct).toBe(50);
    const allWrong = Object.fromEntries(
      shuffled.map((q) => {
        const wrong = (["A", "B", "C", "D"] as const).find((l) => l !== q.correct)!;
        return [q.id, wrong];
      })
    );
    expect(scoreQuiz(shuffled, allWrong).correct).toBe(0);
  });

  it("avoids a fixed A-B-C-D repeating pattern for a 50-question session", () => {
    const shuffled = shuffleExamPracticeSet(getPromotionFreeQuestions(), 314159);
    const letters = shuffled.map((q) => q.correct).join("");
    expect(letters).not.toBe("ABCD".repeat(12) + "AB");
    expect(letters).not.toMatch(/^(A{10,}|B{10,}|C{10,}|D{10,})/);
    const dist = countCorrectLetterDistribution(shuffled);
    // Reasonably balanced — not all on one letter (source bank was 43×A).
    expect(Math.max(dist.A, dist.B, dist.C, dist.D)).toBeLessThan(28);
    expect(Math.min(dist.A, dist.B, dist.C, dist.D)).toBeGreaterThan(4);
  });

  it("does not depend on source answer A being correct", () => {
    const forced: ExamPracticeQuestion = {
      id: "force-d",
      topic: "Test",
      stem: "Pick the capital of Ghana",
      options: {
        A: "Kumasi",
        B: "Tamale",
        C: "Cape Coast",
        D: "Accra",
      },
      correct: "D",
      explanation: "Accra is the capital.",
    };
    let sawNonD = false;
    for (let seed = 0; seed < 40; seed += 1) {
      const q = shuffleExamPracticeQuestion(forced, createSeededRng(seed));
      expect(q.options[q.correct]).toBe("Accra");
      if (q.correct !== "D") sawNonD = true;
    }
    expect(sawNonD).toBe(true);
  });
});

describe("Free practice session restore", () => {
  it("restores shuffled questions and answers from sessionStorage", () => {
    const g = globalThis as typeof globalThis & {
      sessionStorage?: Storage;
      window?: typeof globalThis;
    };
    const store = new Map<string, string>();
    const memoryStorage: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, String(v));
      },
      removeItem: (k) => {
        store.delete(k);
      },
      key: (i) => [...store.keys()][i] ?? null,
    };
    g.sessionStorage = memoryStorage;
    g.window = g as unknown as Window & typeof globalThis;

    clearFreePracticeDraft();
    const draft = buildShuffledFreePractice(PROMOTION_FREE_SET_META.id, 777, 50);
    const first = draft.questions[0]!;
    draft.answers[first.id] = first.correct;
    draft.index = 3;
    draft.secondsLeft = 1200;
    saveFreePracticeDraft(draft);

    const restored = loadFreePracticeDraft(PROMOTION_FREE_SET_META.id);
    expect(restored).not.toBeNull();
    expect(restored!.seed).toBe(777);
    expect(restored!.questions[0]!.options).toEqual(first.options);
    expect(restored!.questions[0]!.correct).toBe(first.correct);
    expect(restored!.answers[first.id]).toBe(first.correct);
    expect(restored!.index).toBe(3);
    expect(scoreQuiz(restored!.questions, restored!.answers).correct).toBe(1);

    clearFreePracticeDraft();
  });
});

describe("Tech Hub / teacher-promotion bank option permutations", () => {
  it("shuffles stored questions without losing options or key integrity", () => {
    const ids = selectTechQuestionIds({
      courseSlug: "exam-teacher-promotion",
      mode: "random",
      count: 20,
      seed: 88,
      questionType: "mcq",
    });
    expect(ids.length).toBeGreaterThan(0);
    const questions = ids.map(
      (id) => getTechBankQuestions("exam-teacher-promotion").find((q) => q.questionId === id)!
    );
    expect(questions.every((q) => (q.questionType || "mcq") === "mcq")).toBe(true);
    const perms = buildSessionOptionPermutations(
      questions.map((q) => ({
        questionId: q.questionId,
        options: q.options,
        questionType: q.questionType,
      })),
      88
    );

    const displayCorrectAnswers: Record<string, number> = {};
    for (const q of questions) {
      const perm = perms[q.questionId]!;
      const presented = presentTechQuestion(q, perm);
      expect(presented.options).toHaveLength(4);
      expect(new Set(presented.options).size).toBe(4);
      expect([...presented.options].sort()).toEqual([...q.options].sort());
      const displayCorrect = displayCorrectIndex(q.correctIndex, perm);
      expect(presented.options[displayCorrect]).toBe(q.options[q.correctIndex]);
      displayCorrectAnswers[q.questionId] = displayCorrect;
      // Selecting the displayed correct maps back to the original key.
      expect(toOriginalOptionIndex(displayCorrect, perm)).toBe(q.correctIndex);
    }

    const graded = gradeTechAnswers({
      courseSlug: "exam-teacher-promotion",
      questionIds: ids,
      answers: displayCorrectAnswers,
      optionPermutations: perms,
    });
    expect(graded.score).toBe(graded.maxScore);

    const wrongAnswers = Object.fromEntries(
      ids.map((id) => {
        const q = questions.find((row) => row.questionId === id)!;
        const perm = perms[id]!;
        const displayCorrect = displayCorrectIndex(q.correctIndex, perm);
        return [id, (displayCorrect + 1) % 4];
      })
    );
    const gradedWrong = gradeTechAnswers({
      courseSlug: "exam-teacher-promotion",
      questionIds: ids,
      answers: wrongAnswers,
      optionPermutations: perms,
    });
    expect(gradedWrong.score).toBe(0);
  });

  it("uses Fisher–Yates (not a fixed rotation) for permutations", () => {
    const rand = createSeededRng(1);
    const samples = Array.from({ length: 24 }, () =>
      fisherYatesShuffle([0, 1, 2, 3], rand).join("")
    );
    expect(new Set(samples).size).toBeGreaterThan(4);
    expect(samples.every((s) => s === "1230")).toBe(false);
  });
});

describe("Existing exam categories still load", () => {
  it("keeps BECE and teacher-promotion banks scorable", () => {
    for (const slug of ["exam-bece-prep", "exam-teacher-promotion"] as const) {
      const rows = getTechBankQuestions(slug);
      expect(rows.length).toBeGreaterThan(10);
      for (const q of rows.slice(0, 5)) {
        expect(q.options).toHaveLength(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
      }
    }
    expect(getPromotionFreeQuestions()).toHaveLength(50);
  });
});
