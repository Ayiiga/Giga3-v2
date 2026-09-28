/**
 * Phase 3 recommendation engine (additive).
 *
 * Every recommendation carries a reason grounded in demonstrated
 * performance — never unexplained. Builds on the Phase 2 progress
 * snapshot and the Phase 3 mastery engine. Paths never lock content:
 * manual exploration is always available.
 */
import { computeMastery, type MasteryScope } from "@/lib/gigalearn/mastery";
import { getSignals } from "@/lib/gigalearn/signals";

export type RecommendationKind = "review-first" | "try-next" | "practice" | "ready-for";

export interface LearningRecommendation {
  id: string;
  kind: RecommendationKind;
  title: string;
  reason: string;
  scope: MasteryScope;
  action: "review-lesson" | "simpler-explanation" | "worked-example" | "practice-questions" | "flashcards" | "mini-quiz" | "revision-video" | "challenge-set";
}

const KIND_TITLE: Record<RecommendationKind, string> = {
  "review-first": "Review this first",
  "try-next": "Try this next",
  practice: "Practice this",
  "ready-for": "You may be ready for",
};

export interface RecommendationInput extends MasteryScope {
  label: string;
  recentCorrect: number;
  recentTotal: number;
  mistakes: number;
  isNextInSequence?: boolean;
}

/**
 * Rule-based, fully explainable recommendations.
 * Example reason: "You answered 4 of your last 5 questions correctly on
 * this topic, so you may be ready for a more challenging practice set."
 */
export function recommendFor(input: RecommendationInput): LearningRecommendation | null {
  const base = {
    subjectId: input.subjectId,
    levelId: input.levelId,
    strand: input.strand,
    subStrand: input.subStrand,
    topic: input.topic,
    indicator: input.indicator,
  };
  const id = `${input.subjectId}/${input.levelId}/${input.topic || input.indicator || "general"}`.toLowerCase();

  if (input.recentTotal >= 4 && input.recentCorrect === input.recentTotal) {
    return {
      id: `${id}/ready`,
      kind: "ready-for",
      title: `${KIND_TITLE["ready-for"]}: a challenging ${input.label} set`,
      reason: `You answered ${input.recentCorrect} of your last ${input.recentTotal} questions correctly on ${input.label}, so you may be ready for a more challenging practice set.`,
      scope: base,
      action: "challenge-set",
    };
  }
  if (input.recentTotal >= 5 && input.recentCorrect / input.recentTotal >= 0.8) {
    return {
      id: `${id}/ready`,
      kind: "ready-for",
      title: `${KIND_TITLE["ready-for"]}: a challenging ${input.label} set`,
      reason: `You answered ${input.recentCorrect} of your last ${input.recentTotal} questions correctly on ${input.label}, so you may be ready for a more challenging practice set.`,
      scope: base,
      action: "challenge-set",
    };
  }
  if (input.mistakes >= 2 || (input.recentTotal >= 2 && input.recentCorrect / input.recentTotal < 0.5)) {
    return {
      id: `${id}/review`,
      kind: "review-first",
      title: `${KIND_TITLE["review-first"]}: ${input.label}`,
      reason: `Based on your recent practice, ${input.label} may need more review — ${input.mistakes} recent mistake${input.mistakes === 1 ? "" : "s"}. Start with a simpler explanation and a worked example.`,
      scope: base,
      action: "simpler-explanation",
    };
  }
  if (input.recentTotal > 0) {
    return {
      id: `${id}/practice`,
      kind: "practice",
      title: `${KIND_TITLE.practice}: ${input.label}`,
      reason: `You have ${input.recentTotal} recent attempt${input.recentTotal === 1 ? "" : "s"} on ${input.label} with ${input.recentCorrect} correct — a short practice set will consolidate it.`,
      scope: base,
      action: "practice-questions",
    };
  }
  if (input.isNextInSequence) {
    return {
      id: `${id}/next`,
      kind: "try-next",
      title: `${KIND_TITLE["try-next"]}: ${input.label}`,
      reason: `${input.label} follows what you just studied in your learning sequence.`,
      scope: base,
      action: "review-lesson",
    };
  }
  return null;
}

export interface PathStep {
  id: string;
  label: string;
  detail: string;
}

/** Dynamic learning path template, adapted by mastery state. */
export function buildLearningPath(label: string, needsSupport: boolean): PathStep[] {
  const steps: PathStep[] = [
    { id: "review", label: "Review concept", detail: needsSupport ? "Start with a simpler explanation." : "Quick recap of the key idea." },
    { id: "example", label: "Study example", detail: "Work through one guided example." },
    { id: "practice", label: "Complete 5 practice questions", detail: "Answer at your own pace — hints are okay." },
    { id: "quiz", label: "Take mini-quiz", detail: "Check understanding without hints." },
    { id: "mistakes", label: "Review mistakes", detail: "Revisit anything missed with explanations." },
    { id: "retry", label: "Retry", detail: "Try the missed questions again." },
    { id: "advance", label: "Advance", detail: "Move to the next topic when ready — nothing is locked." },
  ];
  return steps;
}

/** Summarize the learner's own recent performance for tutor adaptation. */
export function performanceSummaryForTutor(scope: { subjectId?: string; topic?: string }, limit = 10): string {
  const signals = getSignals().slice(0, 40);
  const relevant = signals.filter((s) => {
    if (scope.subjectId && s.subjectId !== scope.subjectId) return false;
    if (scope.topic && !(s.topic || s.strand).toLowerCase().includes(scope.topic.toLowerCase())) return false;
    return true;
  });
  if (!relevant.length) return "";
  const scored = relevant.filter((s) => s.score != null).slice(0, limit);
  const hints = relevant.filter((s) => s.type === "hint-used").length;
  const parts: string[] = [];
  if (scored.length) {
    const avg = Math.round(scored.reduce((a, s) => a + (s.score ?? 0), 0) / scored.length);
    parts.push(`${scored.length} recent scored attempts averaging ${avg}%`);
  }
  if (hints) parts.push(`${hints} hint${hints === 1 ? "" : "s"} used`);
  const mistakes = relevant.filter((s) => s.correct === false).length;
  if (mistakes) parts.push(`${mistakes} recent incorrect`);
  return parts.length ? `Recent performance: ${parts.join(", ")}.` : "";
}

/** Next-activity recommendation from mastery across candidate scopes. */
export function nextActivity(scopes: RecommendationInput[]): LearningRecommendation | null {
  for (const scope of scopes) {
    const rec = recommendFor(scope);
    if (rec && rec.kind === "review-first") return rec;
  }
  for (const scope of scopes) {
    const mastery = computeMastery(scope);
    const rec = recommendFor({
      ...scope,
      recentCorrect: scope.recentCorrect,
      recentTotal: Math.max(scope.recentTotal, mastery.attempts),
      mistakes: scope.mistakes,
    });
    if (rec && rec.kind === "review-first") return rec;
  }
  const sequential = scopes.find((s) => s.isNextInSequence);
  if (sequential) return recommendFor({ ...sequential, recentCorrect: 0, recentTotal: 0, mistakes: 0 });
  return null;
}
