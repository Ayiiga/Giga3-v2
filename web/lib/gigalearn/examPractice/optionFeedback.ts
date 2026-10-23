import type { ExamPracticeOptionId, ExamPracticeQuestion } from "@/lib/gigalearn/examPractice/types";
import { optionIds } from "@/lib/gigalearn/examPractice/quizEngine";

/**
 * Per-option notes for free local practice. Prefer authored
 * `optionExplanations`; otherwise derive concise parallel notes so every
 * option gets feedback after submission.
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
    const lead = question.explanation.split(".")[0]?.trim();
    if (oid === question.correct) {
      out[oid] = lead
        ? `Correct — ${lead}.`
        : `Correct — ${label} satisfies the question.`;
    } else {
      // Tie the miss to the authored explanation — avoid identical generic lines
      // that teach nothing about why this option fails.
      out[oid] = lead
        ? `Incorrect — ${label} is not right here. ${lead}.`
        : `Incorrect — ${label} does not satisfy the question.`;
    }
  }
  return out;
}
