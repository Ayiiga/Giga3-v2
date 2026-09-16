import type { GigaLearnQuestion } from "@/lib/gigalearn/questions";
import type { PracticeModeId } from "@/lib/gigalearn/practiceModes";

const SESSION_KEY = "giga3_gigalearn_practice_session";

export type PracticeSessionSnapshot = {
  toolId: string;
  mode: PracticeModeId;
  level: string;
  subject?: string;
  curriculum?: string;
  questions: GigaLearnQuestion[];
  index: number;
  answers: Record<string, string>;
  results: Record<string, boolean>;
  startedAt: number;
  updatedAt: number;
};

export function loadPracticeSession(): PracticeSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PracticeSessionSnapshot;
    if (!parsed.questions?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePracticeSession(snapshot: PracticeSessionSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...snapshot, updatedAt: Date.now() }));
  } catch {
    /* quota */
  }
}

export function clearPracticeSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
