/**
 * Device-local draft for an in-progress free promotion practice session.
 * Keeps shuffled option order + answers so refresh cannot desync the key.
 */
import type { ExamPracticeQuestion } from "./types";
import type { QuizAnswerMap } from "./quizEngine";
import { shuffleExamPracticeSet } from "./optionShuffle";
import { getPromotionFreeQuestions } from "./promotionOrientationBank";

const DRAFT_KEY = "giga3_exam_practice_free_draft_v1";

export type FreePracticeDraft = {
  setId: string;
  seed: number;
  questions: ExamPracticeQuestion[];
  answers: QuizAnswerMap;
  index: number;
  secondsLeft: number;
  finished: boolean;
  streak: number;
  updatedAt: number;
};

function isOptionId(value: unknown): value is "A" | "B" | "C" | "D" {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function isQuestion(value: unknown): value is ExamPracticeQuestion {
  if (!value || typeof value !== "object") return false;
  const q = value as ExamPracticeQuestion;
  return (
    typeof q.id === "string" &&
    typeof q.stem === "string" &&
    typeof q.correct === "string" &&
    isOptionId(q.correct) &&
    !!q.options &&
    typeof q.options.A === "string" &&
    typeof q.options.B === "string" &&
    typeof q.options.C === "string" &&
    typeof q.options.D === "string"
  );
}

export function createFreePracticeSeed(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! >>> 0;
  }
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
}

export function buildShuffledFreePractice(
  setId: string,
  seed: number,
  durationMinutes: number
): FreePracticeDraft {
  const questions = shuffleExamPracticeSet(getPromotionFreeQuestions(), seed);
  return {
    setId,
    seed,
    questions,
    answers: {},
    index: 0,
    secondsLeft: Math.max(1, durationMinutes) * 60,
    finished: false,
    streak: 0,
    updatedAt: Date.now(),
  };
}

export function loadFreePracticeDraft(setId: string): FreePracticeDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const draft = parsed as FreePracticeDraft;
    if (draft.setId !== setId) return null;
    if (!Array.isArray(draft.questions) || draft.questions.length === 0) return null;
    if (!draft.questions.every(isQuestion)) return null;
    if (typeof draft.seed !== "number") return null;
    if (typeof draft.index !== "number") return null;
    if (typeof draft.secondsLeft !== "number") return null;
    if (typeof draft.finished !== "boolean") return null;
    if (!draft.answers || typeof draft.answers !== "object") return null;
    for (const [id, letter] of Object.entries(draft.answers)) {
      if (letter != null && !isOptionId(letter)) return null;
      if (!draft.questions.some((q) => q.id === id)) return null;
    }
    // Integrity: answers must still match the stored shuffled key.
    for (const q of draft.questions) {
      const selected = draft.answers[q.id];
      if (selected && !isOptionId(selected)) return null;
      if (!q.options[q.correct]?.trim()) return null;
    }
    return {
      ...draft,
      streak: typeof draft.streak === "number" ? draft.streak : 0,
      answers: { ...draft.answers },
      questions: draft.questions.map((q) => ({
        ...q,
        options: { ...q.options },
      })),
    };
  } catch {
    return null;
  }
}

export function saveFreePracticeDraft(draft: FreePracticeDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: Date.now() })
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearFreePracticeDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
