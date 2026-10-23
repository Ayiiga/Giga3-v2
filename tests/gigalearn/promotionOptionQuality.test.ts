/**
 * Promotion rank banks — clue leakage, per-option explanations, grading integrity.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getTechBankQuestions,
  gradeTechAnswers,
  presentOptionExplanations,
  presentTechQuestion,
  buildSessionOptionPermutations,
} from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
import { optionFeedbackNotes } from "../../web/lib/gigalearn/examPractice/optionFeedback";
import { getPromotionFreeQuestions } from "../../web/lib/gigalearn/examPractice/promotionOrientationBank";
import {
  displayCorrectIndex,
  toOriginalOptionIndex,
} from "../../web/lib/gigalearn/examPractice/optionShuffle";
import { rewardForCorrectAnswer, rewardForIncorrectAnswer } from "../../web/lib/gigalearn/examPractice/rewardCopy";

const ROOT = resolve(__dirname, "../..");
const RANK_SLUGS = [
  "exam-ad-ii",
  "exam-ad-i",
  "exam-deputy-director",
  "exam-director-ii",
  "exam-director-i",
] as const;

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("promotion rank option quality (5 ranks)", () => {
  it("has no practice-phrase stem leakage remaining", () => {
    for (const slug of RANK_SLUGS) {
      const bank = getTechBankQuestions(slug, { approvedOnly: false });
      for (const q of bank) {
        expect(q.questionText).not.toMatch(
          /Which principle is most directly described by the following practice:/i
        );
        if ((q.questionType || "mcq") !== "mcq") continue;
        const stem = norm(q.questionText);
        const correct = norm(q.options[q.correctIndex] ?? "");
        if (correct.length >= 8) {
          expect(stem.includes(correct)).toBe(false);
        }
      }
    }
  });

  it("provides optionExplanations for every published practice item", () => {
    for (const slug of RANK_SLUGS) {
      const bank = getTechBankQuestions(slug, { approvedOnly: false });
      expect(bank.length).toBeGreaterThan(0);
      for (const q of bank) {
        expect(q.optionExplanations?.length).toBe(q.options.length);
        for (const note of q.optionExplanations ?? []) {
          expect(note.trim().length).toBeGreaterThan(8);
        }
        const correctNote = q.optionExplanations?.[q.correctIndex] ?? "";
        expect(correctNote.toLowerCase()).toMatch(/correct/);
      }
    }
  });

  it("keeps answer keys stable under option shuffle with remapped explanations", () => {
    for (const slug of RANK_SLUGS) {
      const sample = getTechBankQuestions(slug, { approvedOnly: false })
        .filter((q) => (q.questionType || "mcq") === "mcq")
        .slice(0, 25);
      const perms = buildSessionOptionPermutations(
        sample.map((q) => ({
          questionId: q.questionId,
          options: q.options,
          questionType: q.questionType,
        })),
        9090
      );
      for (const q of sample) {
        const perm = perms[q.questionId]!;
        const presented = presentTechQuestion(q, perm);
        const notes = presentOptionExplanations(q, perm)!;
        const displayCorrect = displayCorrectIndex(q.correctIndex, perm);
        expect(presented.options[displayCorrect]).toBe(q.options[q.correctIndex]);
        expect(notes[displayCorrect].toLowerCase()).toMatch(/correct/);
        const graded = gradeTechAnswers({
          courseSlug: slug,
          questionIds: [q.questionId],
          answers: { [q.questionId]: displayCorrect },
          optionPermutations: perms,
        });
        expect(graded.score).toBe(1);
        expect(graded.results[0]?.optionExplanations?.[displayCorrect]).toMatch(/correct/i);
        // Wrong display index must map back and score 0
        const wrongDisplay = (displayCorrect + 1) % q.options.length;
        const wrongOriginal = toOriginalOptionIndex(wrongDisplay, perm);
        expect(wrongOriginal).not.toBe(q.correctIndex);
        const miss = gradeTechAnswers({
          courseSlug: slug,
          questionIds: [q.questionId],
          answers: { [q.questionId]: wrongDisplay },
          optionPermutations: perms,
        });
        expect(miss.score).toBe(0);
      }
    }
  });

  it("records repair report with honest counts", () => {
    const report = JSON.parse(
      readFileSync(resolve(ROOT, "docs/gigalearn/promotion-option-quality-report.json"), "utf8")
    );
    expect(report.repaired).toBe(138);
    expect(report.clue_repaired_tagged).toBe(138);
    let withNotes = 0;
    for (const slug of RANK_SLUGS) {
      withNotes += getTechBankQuestions(slug, { approvedOnly: false }).filter(
        (q) => q.optionExplanations?.length === q.options.length
      ).length;
    }
    expect(withNotes).toBeGreaterThanOrEqual(500);
  });
});

describe("free orientation option feedback + rewards", () => {
  it("derives a note for every A–D option", () => {
    const qs = getPromotionFreeQuestions();
    for (const q of qs.slice(0, 10)) {
      const notes = optionFeedbackNotes(q);
      expect(Object.keys(notes)).toEqual(["A", "B", "C", "D"]);
      expect(notes[q.correct].toLowerCase()).toMatch(/correct/);
    }
  });

  it("incorrect notes are distinct and cite the authored explanation lead", () => {
    const q = getPromotionFreeQuestions()[0]!;
    const notes = optionFeedbackNotes(q);
    const wrong = (["A", "B", "C", "D"] as const).filter((id) => id !== q.correct);
    const lead = q.explanation.split(".")[0]?.trim() ?? "";
    expect(lead.length).toBeGreaterThan(8);
    for (const id of wrong) {
      expect(notes[id].toLowerCase()).toMatch(/incorrect/);
      expect(notes[id]).toContain(lead);
      expect(notes[id]).not.toBe(notes[q.correct]);
    }
    // Wrong options must not all share one identical generic sentence.
    expect(new Set(wrong.map((id) => notes[id])).size).toBeGreaterThan(1);
  });

  it("praise rewards differ for correct vs incorrect and stay non-empty", () => {
    expect(rewardForCorrectAnswer({ streak: 1, seed: 3 })).toBeTruthy();
    expect(rewardForIncorrectAnswer({ seed: 3 })).toBeTruthy();
    expect(rewardForCorrectAnswer({ streak: 1, seed: 3 })).not.toBe(
      rewardForIncorrectAnswer({ seed: 3 })
    );
    expect(rewardForCorrectAnswer({ streak: 3, seed: 0 })).toMatch(/3 in a row/i);
  });

  it("keeps exam-ad-ii-q001 flagged for human answer-key review", () => {
    const report = JSON.parse(
      readFileSync(resolve(ROOT, "docs/gigalearn/promotion-option-quality-report.json"), "utf8")
    );
    expect(report.flaggedIds).toContain("exam-ad-ii-q001");
    const bank = getTechBankQuestions("exam-ad-ii", { approvedOnly: false });
    const q001 = bank.find((q) => q.questionId === "exam-ad-ii-q001");
    expect(q001).toBeTruthy();
    expect(q001?.tags ?? []).toEqual(
      expect.arrayContaining(["needs_human_review_answer_key"])
    );
  });
});

describe("TechHubPractice learn feedback wiring", () => {
  it("renders option notes after learn feedback and guards resubmit", () => {
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/TechHubPractice.tsx"),
      "utf8"
    );
    expect(ui).toContain("optionExplanations");
    expect(ui).toContain("exam-option-note-correct");
    expect(ui).toContain('mode === "learn" && learnFeedback != null');
    const convex = readFileSync(resolve(ROOT, "convex/gigaLearnTechBanks.ts"), "utf8");
    expect(convex).toContain("optionExplanations");
  });
});
