/**
 * Phase 3 adaptive question generation (additive).
 *
 * Extends the Phase 2 assessment system: difficulty adapts from mastery
 * state and mistake patterns, expressed as prompt guidance for the
 * existing generation pipeline (no replacement). Difficulty alone never
 * measures mastery.
 */
import type { MasteryResult } from "@/lib/gigalearn/mastery";

export type AdaptiveDifficulty = "foundational" | "developing" | "standard" | "challenging";

export const ADAPTIVE_DIFFICULTIES: AdaptiveDifficulty[] = [
  "foundational",
  "developing",
  "standard",
  "challenging",
];

const ORDER: Record<AdaptiveDifficulty, number> = {
  foundational: 0,
  developing: 1,
  standard: 2,
  challenging: 3,
};

/** Map mastery → starting difficulty (conservative by default). */
export function difficultyForMastery(mastery: MasteryResult): AdaptiveDifficulty {
  if (mastery.needsMoreEvidence) return "foundational";
  switch (mastery.state) {
    case "mastered":
      return "challenging";
    case "proficient":
      return "standard";
    case "developing":
      return "developing";
    default:
      return "foundational";
  }
}

/** Step difficulty after an attempt — one step at a time, never jumping. */
export function stepDifficulty(
  current: AdaptiveDifficulty,
  correct: boolean,
  streak = 1
): AdaptiveDifficulty {
  const idx = ORDER[current];
  if (correct && streak >= 2 && idx < 3) {
    return ADAPTIVE_DIFFICULTIES[idx + 1]!;
  }
  if (!correct && idx > 0) {
    return ADAPTIVE_DIFFICULTIES[idx - 1]!;
  }
  return current;
}

const DIFFICULTY_GUIDANCE: Record<AdaptiveDifficulty, string> = {
  foundational: "Foundational difficulty: recall of key terms, single-step questions, generous scaffolding and worked examples.",
  developing: "Developing difficulty: short explanations and two-step problems building on the basics.",
  standard: "Standard difficulty: grade-level questions mixing recall, understanding and application.",
  challenging: "Challenging difficulty: multi-step, scenario-based and extension questions that stretch the learner fairly.",
};

/** Prompt fragment appended to quiz/practice generation requests. */
export function adaptiveDifficultyPrompt(
  difficulty: AdaptiveDifficulty,
  mistakeHints?: string[]
): string {
  const parts = [DIFFICULTY_GUIDANCE[difficulty]];
  if (mistakeHints?.length) {
    parts.push(`The learner has struggled with: ${mistakeHints.slice(0, 3).join("; ")}. Include targeted questions on these patterns without shaming.`);
  }
  return parts.join(" ");
}
