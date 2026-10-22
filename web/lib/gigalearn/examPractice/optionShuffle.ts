/**
 * Fisher–Yates option shuffling for Exam Practice MCQs.
 * Preserves answer-key identity: the correct *text* stays correct; only the
 * displayed letter / index changes.
 */
import type { ExamPracticeOptionId, ExamPracticeQuestion } from "./types";

export type Rng = () => number;

const OPTION_LETTERS: ExamPracticeOptionId[] = ["A", "B", "C", "D"];

/** Mulberry32 — deterministic, not cryptographic. */
export function createSeededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place Fisher–Yates; returns the same array reference. */
export function fisherYatesShuffleInPlace<T>(arr: T[], rand: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function fisherYatesShuffle<T>(items: readonly T[], rand: Rng): T[] {
  return fisherYatesShuffleInPlace([...items], rand);
}

type OptionEntry = {
  text: string;
  isCorrect: boolean;
};

/**
 * Shuffle A–D option texts and recompute the correct letter.
 * Does not change factual correctness — only display order.
 */
export function shuffleExamPracticeQuestion(
  question: ExamPracticeQuestion,
  rand: Rng
): ExamPracticeQuestion {
  const entries: OptionEntry[] = OPTION_LETTERS.map((letter) => ({
    text: question.options[letter],
    isCorrect: letter === question.correct,
  }));

  if (entries.some((e) => !e.text?.trim())) {
    return { ...question, options: { ...question.options } };
  }
  if (entries.filter((e) => e.isCorrect).length !== 1) {
    return { ...question, options: { ...question.options } };
  }

  const shuffled = fisherYatesShuffle(entries, rand);
  const options = { ...question.options };
  let correct: ExamPracticeOptionId = question.correct;
  for (let i = 0; i < OPTION_LETTERS.length; i += 1) {
    const letter = OPTION_LETTERS[i]!;
    const entry = shuffled[i]!;
    options[letter] = entry.text;
    if (entry.isCorrect) correct = letter;
  }

  return {
    ...question,
    options,
    correct,
  };
}

/** Shuffle every question independently (fresh rand draws per item). */
export function shuffleExamPracticeSet(
  questions: readonly ExamPracticeQuestion[],
  seed: number
): ExamPracticeQuestion[] {
  const rand = createSeededRng(seed);
  return questions.map((q) => shuffleExamPracticeQuestion(q, rand));
}

/**
 * Build a display→original index permutation for a 4-option tech-bank item.
 * `permutation[displayIndex] === originalIndex`.
 */
export function buildOptionPermutation(
  optionCount: number,
  rand: Rng
): number[] {
  const n = Math.max(0, Math.min(4, Math.floor(optionCount)));
  const indices = Array.from({ length: n }, (_, i) => i);
  return fisherYatesShuffle(indices, rand);
}

export function applyOptionPermutation(
  options: readonly string[],
  permutation: readonly number[]
): { options: string[]; correctIndex: number; permutation: number[] } {
  const perm =
    permutation.length === options.length
      ? [...permutation]
      : options.map((_, i) => i);
  const nextOptions = perm.map((original) => options[original] ?? "");
  return {
    options: nextOptions,
    correctIndex: -1, // caller sets from original correct
    permutation: perm,
  };
}

export function displayCorrectIndex(
  originalCorrectIndex: number,
  permutation: readonly number[]
): number {
  const idx = permutation.indexOf(originalCorrectIndex);
  return idx >= 0 ? idx : originalCorrectIndex;
}

export function toOriginalOptionIndex(
  displayIndex: number,
  permutation: readonly number[] | undefined
): number {
  if (!permutation || permutation.length === 0) return displayIndex;
  if (displayIndex < 0 || displayIndex >= permutation.length) return displayIndex;
  return permutation[displayIndex]!;
}

export function countCorrectLetterDistribution(
  questions: readonly ExamPracticeQuestion[]
): Record<ExamPracticeOptionId, number> {
  const out: Record<ExamPracticeOptionId, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const q of questions) {
    out[q.correct] += 1;
  }
  return out;
}

export function optionIds(): ExamPracticeOptionId[] {
  return [...OPTION_LETTERS];
}
