/**
 * Device-local Exam Practice progress (free orientation).
 * Never fabricates scores — only stores what the learner actually completed.
 */

const KEY = "giga3_exam_practice_local_progress_v1";

export type LocalExamPracticeResult = {
  setId: string;
  category: "teacher_promotion" | "bece";
  correct: number;
  total: number;
  percent: number;
  finishedAt: number;
};

export function loadLocalExamPracticeResults(): LocalExamPracticeResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row): row is LocalExamPracticeResult =>
          !!row &&
          typeof row === "object" &&
          typeof (row as LocalExamPracticeResult).setId === "string" &&
          typeof (row as LocalExamPracticeResult).percent === "number"
      )
      .slice(0, 40);
  } catch {
    return [];
  }
}

export function recordLocalExamPracticeResult(
  result: LocalExamPracticeResult
): void {
  if (typeof window === "undefined") return;
  try {
    const prev = loadLocalExamPracticeResults();
    const next = [result, ...prev].slice(0, 40);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}
