/**
 * Phase 3 learning-signal log (additive).
 *
 * Every adaptive calculation reads from this append-only on-device log plus
 * the existing stores (progress snapshot, server `gigaLearnProgress` rows,
 * flashcard mastery). Signals are the learner's own events — never shared,
 * never sent anywhere except as anonymized counts inside their own AI
 * prompts (performance summaries).
 */
export type LearningSignalType =
  | "practice"
  | "quiz"
  | "marking"
  | "hint-used"
  | "tutor-turn"
  | "flashcard-review"
  | "lesson-completed"
  | "socratic-step";

export interface LearningSignal {
  id: string;
  type: LearningSignalType;
  subjectId: string;
  levelId: string;
  gradeId: string;
  strand: string;
  subStrand: string;
  topic: string;
  indicator: string;
  /** 0–100 when the signal carries a score. */
  score: number | null;
  correct: boolean | null;
  /** Socratic/error detail, flashcard id, etc. */
  detail: string;
  at: number;
}

export type NewLearningSignal = Omit<LearningSignal, "id" | "at"> & {
  at?: number;
};

const SIGNALS_KEY = "giga3_gigalearn_signals";
const MAX_SIGNALS = 500;

function readSignals(): LearningSignal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SIGNALS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as LearningSignal[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeSignals(signals: LearningSignal[]): void {
  try {
    localStorage.setItem(SIGNALS_KEY, JSON.stringify(signals.slice(0, MAX_SIGNALS)));
  } catch {
    /* quota */
  }
}

export function logSignal(signal: NewLearningSignal): LearningSignal {
  const entry: LearningSignal = {
    ...signal,
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: signal.at ?? Date.now(),
  };
  writeSignals([entry, ...readSignals()]);
  return entry;
}

export function getSignals(): LearningSignal[] {
  return readSignals();
}

export function clearSignals(): void {
  try {
    localStorage.removeItem(SIGNALS_KEY);
  } catch {
    /* ignore */
  }
}

export interface SignalScope {
  subjectId?: string;
  levelId?: string;
  topic?: string;
  strand?: string;
  indicator?: string;
  since?: number;
}

/** Topic key shared with the mastery engine (stable IDs, lowercase). */
export function signalTopicKey(s: Pick<LearningSignal, "subjectId" | "levelId" | "strand" | "topic" | "indicator">): string {
  return [s.subjectId, s.levelId, s.strand, s.topic || s.indicator]
    .filter(Boolean)
    .join("/")
    .toLowerCase();
}

export function filterSignals(signals: LearningSignal[], scope: SignalScope): LearningSignal[] {
  return signals.filter((s) => {
    if (scope.subjectId && s.subjectId !== scope.subjectId) return false;
    if (scope.levelId && s.levelId !== scope.levelId) return false;
    if (scope.strand && s.strand.toLowerCase() !== scope.strand.toLowerCase()) return false;
    if (scope.indicator && s.indicator.toLowerCase() !== scope.indicator.toLowerCase()) return false;
    if (scope.topic && !(s.topic || s.indicator).toLowerCase().includes(scope.topic.toLowerCase())) return false;
    if (scope.since && s.at < scope.since) return false;
    return true;
  });
}
