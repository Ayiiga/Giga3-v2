/**
 * Phase 3 error analysis (additive).
 *
 * Classifies mistakes where evidence reasonably supports it — otherwise
 * returns "unknown" ("Not enough information to determine the cause").
 * Used for instant local labels; the server marking verdict remains the
 * authority for AI-graded answers.
 */
export type ErrorCategory =
  | "concept-misunderstanding"
  | "calculation-error"
  | "misreading"
  | "missing-step"
  | "vocabulary-issue"
  | "incomplete-response"
  | "careless-error"
  | "unknown";

export interface ErrorAnalysis {
  category: ErrorCategory;
  confidence: "high" | "medium" | "low";
  label: string;
  note: string;
}

const CATEGORY_LABELS: Record<ErrorCategory, string> = {
  "concept-misunderstanding": "Concept misunderstanding",
  "calculation-error": "Calculation error",
  misreading: "Misreading the question",
  "missing-step": "Missing step",
  "vocabulary-issue": "Vocabulary issue",
  "incomplete-response": "Incomplete response",
  "careless-error": "Careless error",
  unknown: "Not enough information to determine the cause",
};

const NUMBER_PATTERN = /-?\d+(?:\.\d+)?/g;

function numbers(text: string): string[] {
  return text.match(NUMBER_PATTERN) ?? [];
}

/**
 * Heuristic classification from question + learner answer + reference.
 * Deliberately conservative: sparse evidence → "unknown" with low confidence.
 */
export function analyzeError(args: {
  question: string;
  studentAnswer: string;
  correctAnswer?: string;
  hintUsed?: boolean;
  timeSpentSec?: number;
}): ErrorAnalysis {
  const question = args.question.trim();
  const answer = args.studentAnswer.trim();
  const reference = (args.correctAnswer ?? "").trim();

  if (!question || !answer) {
    return { category: "unknown", confidence: "low", label: CATEGORY_LABELS.unknown, note: "No answer to analyze." };
  }

  // Empty-ish / fragment answers carry no causal evidence.
  if (answer.length < 3) {
    return {
      category: "incomplete-response",
      confidence: "medium",
      label: CATEGORY_LABELS["incomplete-response"],
      note: "The response is too short to show working or reasoning.",
    };
  }

  if (reference) {
    const qNums = numbers(question);
    const aNums = numbers(answer);
    const rNums = numbers(reference);
    // Same numbers as the question but wrong result → likely arithmetic slip.
    if (
      rNums.length > 0 &&
      aNums.length > 0 &&
      aNums.some((n) => !rNums.includes(n)) &&
      qNums.length > 0 &&
      aNums.some((n) => qNums.includes(n))
    ) {
      return {
        category: "calculation-error",
        confidence: "medium",
        label: CATEGORY_LABELS["calculation-error"],
        note: "Numbers from the question reappear but the computed value differs.",
      };
    }
    // Correct value present but wrapped in confusion → possible misread.
    if (rNums.length > 0 && aNums.length > rNums.length + 1) {
      return {
        category: "misreading",
        confidence: "low",
        label: CATEGORY_LABELS.misreading,
        note: "Extra values suggest the question may have been misread — treat as uncertain.",
      };
    }
  }

  // "I don't know" style responses → concept gap, stated by the learner.
  if (/^(i )?(dont|don't|do not) know|no idea|not sure|blank$/i.test(answer)) {
    return {
      category: "concept-misunderstanding",
      confidence: "medium",
      label: CATEGORY_LABELS["concept-misunderstanding"],
      note: "The learner reports not knowing — reteach the concept.",
    };
  }

  // Very fast wrong answers sometimes indicate rushing — but never assert.
  if (args.timeSpentSec != null && args.timeSpentSec < 5 && answer.length > 20) {
    return {
      category: "careless-error",
      confidence: "low",
      label: CATEGORY_LABELS["careless-error"],
      note: "Answered quickly; rushing is possible but unproven.",
    };
  }

  return {
    category: "unknown",
    confidence: "low",
    label: CATEGORY_LABELS.unknown,
    note: "Not enough information to determine the cause — review the working with the learner.",
  };
}

export function errorCategoryLabel(category: ErrorCategory): string {
  return CATEGORY_LABELS[category];
}
