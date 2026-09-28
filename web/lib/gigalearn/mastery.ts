/**
 * Phase 3 mastery engine (additive).
 *
 * Mastery states are learning states — not grades or permanent labels:
 * not-started → learning → developing → proficient → mastered.
 *
 * Calculated from actual interactions (multiple signals required; a single
 * question never decides), tracked at Subject → Strand → Sub-strand →
 * Topic → Indicator granularity using stable curriculum IDs.
 */
import { filterSignals, getSignals, signalTopicKey, type LearningSignal } from "@/lib/gigalearn/signals";
import { masteredForDeck } from "@/lib/gigalearn/flashcards";

export type MasteryState = "not-started" | "learning" | "developing" | "proficient" | "mastered";

export interface MasteryScope {
  subjectId: string;
  levelId: string;
  strand: string;
  subStrand: string;
  topic: string;
  indicator: string;
}

export interface MasteryResult {
  key: string;
  state: MasteryState;
  /** 0–100 confidence-weighted estimate. */
  score: number;
  attempts: number;
  correct: number;
  hintsUsed: number;
  flashcardsMastered: number;
  flashcardsTotal: number;
  lastPracticedAt: number | null;
  needsMoreEvidence: boolean;
}

export const MASTERY_LABELS: Record<MasteryState, string> = {
  "not-started": "Not started",
  learning: "Learning",
  developing: "Developing",
  proficient: "Proficient",
  mastered: "Mastered",
};

const MIN_ATTEMPTS_FOR_MASTERED = 5;
const MIN_ATTEMPTS_FOR_PROFICIENT = 3;

function scopeKey(scope: MasteryScope): string {
  return [scope.subjectId, scope.levelId, scope.strand, scope.subStrand, scope.topic || scope.indicator]
    .filter(Boolean)
    .join("/")
    .toLowerCase();
}

export function masteryKeyFor(scope: MasteryScope): string {
  return scopeKey(scope);
}

interface ServerProgressRow {
  topicKey: string;
  lastScore?: number | null;
  practiceCount?: number;
  needsReassess?: boolean;
}

/**
 * Compute mastery from multiple signals. Single data points only ever
 * reach "learning"; "mastered" requires sustained correct performance
 * across several attempts with limited hint dependence.
 */
export function computeMastery(
  scope: MasteryScope,
  options?: {
    signals?: LearningSignal[];
    serverRows?: ServerProgressRow[];
    flashcardDecks?: Array<{ deckId: string; total: number }>;
  }
): MasteryResult {
  const key = scopeKey(scope);
  const signals = filterSignals(options?.signals ?? getSignals(), {
    subjectId: scope.subjectId || undefined,
    levelId: scope.levelId || undefined,
    topic: scope.topic || scope.strand || undefined,
  }).filter((s) => !key || signalTopicKey(s).startsWith(key.split("/").slice(0, 2).join("/")));

  const scored = signals.filter((s) => s.score != null);
  const attempts = scored.length;
  const correct = scored.filter((s) => (s.correct ?? (s.score ?? 0) >= 70)).length;
  const hintsUsed = signals.filter((s) => s.type === "hint-used").length;

  let flashcardsMastered = 0;
  let flashcardsTotal = 0;
  for (const deck of options?.flashcardDecks ?? []) {
    const mastered = masteredForDeck(deck.deckId).length;
    flashcardsMastered += mastered;
    flashcardsTotal += deck.total;
  }

  // Authorized server history contributes when the topic key overlaps.
  let serverScore: number | null = null;
  let serverPractice = 0;
  for (const row of options?.serverRows ?? []) {
    const rowKey = row.topicKey.toLowerCase();
    const overlap =
      rowKey.includes(scope.subjectId.toLowerCase()) ||
      (scope.topic && rowKey.includes(scope.topic.toLowerCase())) ||
      (scope.strand && rowKey.includes(scope.strand.toLowerCase()));
    if (overlap) {
      if (row.lastScore != null) serverScore = row.lastScore;
      serverPractice += row.practiceCount ?? 0;
    }
  }

  const totalAttempts = attempts + serverPractice;
  const scoreParts: number[] = [];
  if (scored.length) scoreParts.push((correct / scored.length) * 100);
  if (serverScore != null) scoreParts.push(serverScore);
  if (flashcardsTotal > 0) scoreParts.push((flashcardsMastered / flashcardsTotal) * 100);
  const score = scoreParts.length
    ? Math.round(scoreParts.reduce((a, b) => a + b, 0) / scoreParts.length)
    : 0;

  const lastPracticedAt = signals.length
    ? Math.max(...signals.map((s) => s.at))
    : null;

  const hintPenalty = Math.min(20, hintsUsed * 5);
  const adjusted = Math.max(0, score - (totalAttempts >= 3 ? hintPenalty : 0));

  let state: MasteryState = "not-started";
  if (totalAttempts > 0 || flashcardsTotal > 0) state = "learning";
  if (totalAttempts >= 2 && adjusted >= 50) state = "developing";
  if (totalAttempts >= MIN_ATTEMPTS_FOR_PROFICIENT && adjusted >= 70) state = "proficient";
  if (totalAttempts >= MIN_ATTEMPTS_FOR_MASTERED && adjusted >= 85 && hintsUsed <= totalAttempts / 2) {
    state = "mastered";
  }
  // Regression guard: poor recent evidence caps the state.
  const recent = scored.slice(0, 3);
  if (recent.length >= 2 && recent.every((s) => (s.score ?? 0) < 50) && state !== "learning" && state !== "not-started") {
    state = "developing";
  }

  return {
    key,
    state,
    score: adjusted,
    attempts: totalAttempts,
    correct,
    hintsUsed,
    flashcardsMastered,
    flashcardsTotal,
    lastPracticedAt,
    needsMoreEvidence: totalAttempts < MIN_ATTEMPTS_FOR_PROFICIENT,
  };
}

/** Cautious, non-factual language for weak-topic messaging. */
export function weakTopicMessage(topicLabel: string): string {
  return `Based on your recent practice, ${topicLabel} may need more review.`;
}

export function masteryLabel(state: MasteryState): string {
  return MASTERY_LABELS[state];
}
