import type { ExamPracticeOptionId, ExamPracticeQuestion } from "@/lib/gigalearn/examPractice/types";
import { optionIds } from "@/lib/gigalearn/examPractice/quizEngine";

/**
 * Per-option notes for free local practice. Prefer authored
 * `optionExplanations`; otherwise derive concept-oriented notes (never the
 * empty “does not satisfy the question” template alone).
 */
export function optionFeedbackNotes(
  question: ExamPracticeQuestion
): Record<ExamPracticeOptionId, string> {
  const out = {} as Record<ExamPracticeOptionId, string>;
  for (const oid of optionIds()) {
    const authored = question.optionExplanations?.[oid]?.trim();
    if (authored) {
      out[oid] = authored;
      continue;
    }
    const label = question.options[oid];
    if (oid === question.correct) {
      const lead = question.explanation.split(".")[0]?.trim();
      out[oid] = lead
        ? `Correct — ${lead}.`
        : `Correct — ${label} advances professional standards and learner welfare in this scenario.`;
    } else {
      out[oid] = `Incorrect — ${label} weakens the response by delaying action, ignoring evidence, or undermining fair process.`;
    }
  }
  return out;
}
