/**
 * Pure scoring helpers for GigaSocial Awards.
 * Browser-supplied scores are never trusted — only server-side inputs.
 */

export type ScoreWeights = {
  publicVoteWeight: number;
  judgingWeight: number;
  assessmentWeight: number;
  peoplesChoice: boolean;
};

/** Clamp and normalise a raw score already on a 0–100 scale. */
export function normalizeComponentScore(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, raw));
}

/**
 * Convert vote share to a 0–100 component.
 * candidateVotes / maxVotesInCategory * 100 (maxVotes = highest in category).
 */
export function publicVoteComponent(args: {
  candidateVotes: number;
  maxVotesInCategory: number;
}): number {
  const votes = Math.max(0, args.candidateVotes);
  const max = Math.max(0, args.maxVotesInCategory);
  if (max <= 0) return 0;
  return normalizeComponentScore((votes / max) * 100);
}

/** Average of numeric rubric values already 0–100. */
export function averageRubricScore(scores: ReadonlyArray<number>): number {
  const valid = scores.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return 0;
  const sum = valid.reduce((a, b) => a + normalizeComponentScore(b), 0);
  return normalizeComponentScore(sum / valid.length);
}

export function combineWeightedScore(args: {
  weights: ScoreWeights;
  publicVote: number;
  judging: number;
  assessment: number;
}): number {
  const publicVote = normalizeComponentScore(args.publicVote);
  const judging = normalizeComponentScore(args.judging);
  const assessment = normalizeComponentScore(args.assessment);

  if (args.weights.peoplesChoice) {
    return publicVote;
  }

  const wPub = Math.max(0, args.weights.publicVoteWeight);
  const wJudge = Math.max(0, args.weights.judgingWeight);
  const wAssess = Math.max(0, args.weights.assessmentWeight);
  const total = wPub + wJudge + wAssess;
  if (total <= 0) return 0;

  const combined =
    (publicVote * wPub + judging * wJudge + assessment * wAssess) / total;
  return Math.round(normalizeComponentScore(combined) * 100) / 100;
}

/** Default general formula: 40 / 40 / 20. */
export const DEFAULT_GENERAL_WEIGHTS: ScoreWeights = {
  publicVoteWeight: 40,
  judgingWeight: 40,
  assessmentWeight: 20,
  peoplesChoice: false,
};

export function assertWeightsSane(weights: ScoreWeights): void {
  if (weights.peoplesChoice) return;
  const sum =
    weights.publicVoteWeight + weights.judgingWeight + weights.assessmentWeight;
  if (sum <= 0) {
    throw new Error("Scoring weights must sum to a positive value.");
  }
  for (const n of [
    weights.publicVoteWeight,
    weights.judgingWeight,
    weights.assessmentWeight,
  ]) {
    if (!Number.isFinite(n) || n < 0) {
      throw new Error("Scoring weights must be non-negative numbers.");
    }
  }
}

/**
 * Tie-break: higher public votes, then higher judging, then earlier publishedAt,
 * then lexicographic displayCode.
 */
export function compareCandidatesForRanking(
  a: {
    finalScore: number;
    publicVotes: number;
    judging: number;
    publishedAt: number;
    displayCode: string;
  },
  b: typeof a
): number {
  if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
  if (b.publicVotes !== a.publicVotes) return b.publicVotes - a.publicVotes;
  if (b.judging !== a.judging) return b.judging - a.judging;
  if (a.publishedAt !== b.publishedAt) return a.publishedAt - b.publishedAt;
  return a.displayCode.localeCompare(b.displayCode);
}

export function formatDisplayCode(year: number, sequence: number): string {
  const seq = Math.max(1, Math.floor(sequence));
  return `GSA-${year}-${String(seq).padStart(5, "0")}`;
}

/** Packages must never influence competition outcomes. */
export function packageInfluencesCompetition(): false {
  return false;
}
