/**
 * Phase 3 revision center + spaced review (additive).
 *
 * Groups: Review Now / Continue Learning / Mastered / Recommended /
 * Practice Again. Extends the Phase 2 flashcard mastery buckets
 * (due / recently-missed / frequently-forgotten / strongly-remembered)
 * and keeps recommendation counts manageable (never a notification flood).
 */
import { masteredForDeck } from "@/lib/gigalearn/flashcards";
import { computeMastery, type MasteryResult, type MasteryScope } from "@/lib/gigalearn/mastery";
import { getSignals, type LearningSignal } from "@/lib/gigalearn/signals";

export interface ReviewTopic extends MasteryScope {
  label: string;
  gradeLabel: string;
  mastery: MasteryResult;
  recentScores: number[];
  missedRecently: boolean;
}

export interface RevisionGroups {
  reviewNow: ReviewTopic[];
  continuelearning: ReviewTopic[];
  mastered: ReviewTopic[];
  practiceAgain: ReviewTopic[];
}

export interface SpacedBuckets {
  dueForReview: string[];
  recentlyMissed: string[];
  frequentlyForgotten: string[];
  stronglyRemembered: string[];
}

const MAX_PER_GROUP = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface KnownTopic extends MasteryScope {
  label: string;
  gradeLabel: string;
}

/** Candidate topics come from the learner's own history (signals + decks). */
export function collectKnownTopics(signals: LearningSignal[]): KnownTopic[] {
  const map = new Map<string, KnownTopic>();
  for (const s of signals) {
    if (!s.subjectId) continue;
    const key = [s.subjectId, s.levelId, s.strand, s.topic || s.indicator].join("/").toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        label: s.topic || s.strand || s.subjectId,
        gradeLabel: s.gradeId,
        subjectId: s.subjectId,
        levelId: s.levelId,
        strand: s.strand,
        subStrand: s.subStrand,
        topic: s.topic,
        indicator: s.indicator,
      });
    }
  }
  return [...map.values()];
}

export function groupRevisionTopics(
  topics: KnownTopic[],
  options?: {
    signals?: LearningSignal[];
    serverRows?: Array<{ topicKey: string; lastScore?: number | null; practiceCount?: number; needsReassess?: boolean }>;
    flashcardDecks?: Array<{ deckId: string; total: number; topicKey: string }>;
    now?: number;
  }
): RevisionGroups {
  const signals = options?.signals ?? getSignals();
  const now = options?.now ?? Date.now();
  const enriched: ReviewTopic[] = topics.map((t) => {
    const mastery = computeMastery(t, {
      signals,
      serverRows: options?.serverRows,
      flashcardDecks: (options?.flashcardDecks ?? []).filter((d) =>
        d.topicKey.toLowerCase().includes(t.topic.toLowerCase() || t.strand.toLowerCase())
      ),
    });
    const recentScores = signals
      .filter((s) => s.score != null)
      .slice(0, 5)
      .map((s) => s.score as number);
    const missedRecently = signals
      .slice(0, 8)
      .some((s) => s.correct === false || (s.score != null && s.score < 50));
    void now;
    return { ...t, mastery, recentScores, missedRecently };
  });

  const reviewNow = enriched
    .filter((t) => t.missedRecently || t.mastery.state === "learning" || t.mastery.state === "developing")
    .slice(0, MAX_PER_GROUP);
  const practiceAgain = enriched
    .filter((t) => t.missedRecently && !reviewNow.includes(t))
    .slice(0, MAX_PER_GROUP);
  const mastered = enriched.filter((t) => t.mastery.state === "mastered" || t.mastery.state === "proficient").slice(0, MAX_PER_GROUP);
  const continuelearning = enriched
    .filter((t) => !reviewNow.includes(t) && !mastered.includes(t) && !practiceAgain.includes(t))
    .slice(0, MAX_PER_GROUP);
  return { reviewNow, continuelearning, mastered, practiceAgain };
}

/** Spaced-review buckets from flashcard decks + miss history. */
export function spacedBuckets(
  decks: Array<{ deckId: string; total: number; lastReviewedAt?: number }>,
  signals: LearningSignal[],
  now = Date.now()
): SpacedBuckets {
  const dueForReview: string[] = [];
  const stronglyRemembered: string[] = [];
  for (const deck of decks) {
    const masteredCount = masteredForDeck(deck.deckId).length;
    const stale = !deck.lastReviewedAt || now - deck.lastReviewedAt > 3 * DAY_MS;
    if (deck.total > 0 && masteredCount >= deck.total && !stale) {
      stronglyRemembered.push(deck.deckId);
    } else if (stale || masteredCount < deck.total) {
      dueForReview.push(deck.deckId);
    }
  }
  const recent = signals.slice(0, 20);
  const recentlyMissed = Array.from(
    new Set(
      recent
        .filter((s) => s.correct === false || (s.score != null && s.score < 50))
        .map((s) => s.topic || s.strand || s.subjectId)
        .filter(Boolean)
    )
  ).slice(0, MAX_PER_GROUP);
  const missCounts = new Map<string, number>();
  for (const s of signals) {
    if (s.correct === false || (s.score != null && s.score < 50)) {
      const key = (s.topic || s.strand || s.subjectId).toLowerCase();
      missCounts.set(key, (missCounts.get(key) ?? 0) + 1);
    }
  }
  const frequentlyForgotten = [...missCounts.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PER_GROUP)
    .map(([k]) => k);
  return { dueForReview: dueForReview.slice(0, MAX_PER_GROUP), recentlyMissed, frequentlyForgotten, stronglyRemembered: stronglyRemembered.slice(0, MAX_PER_GROUP) };
}
