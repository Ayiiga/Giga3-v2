import type { SourceTier } from "./sourceRegistry";

export type EvidenceStatus =
  | "UNVERIFIED"
  | "REPORTED"
  | "CORROBORATED"
  | "VERIFIED"
  | "OFFICIAL"
  | "CONFLICTING"
  | "INSUFFICIENT_EVIDENCE";

export type ConfidenceLabel =
  | "Very High"
  | "High"
  | "Moderate"
  | "Low"
  | "Very Low";

export type ConfidenceInput = {
  tier: SourceTier;
  articleRetrieved: boolean;
  searchResultOnly: boolean;
  independentSourceCount: number;
  hasPublicationDate: boolean;
  isRecent: boolean;
  hasContradictions: boolean;
  isOfficial: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function confidenceLabelFromScore(score: number): ConfidenceLabel {
  if (score >= 0.9) return "Very High";
  if (score >= 0.75) return "High";
  if (score >= 0.5) return "Moderate";
  if (score >= 0.25) return "Low";
  return "Very Low";
}

export function computeConfidenceScore(input: ConfidenceInput): number {
  let score = 0.35;

  if (input.isOfficial) score += 0.35;
  else if (input.tier === 2) score += 0.2;
  else if (input.tier === 3) score += 0.08;
  else if (input.tier === 4) score -= 0.15;

  if (input.articleRetrieved) score += 0.22;
  if (input.searchResultOnly && !input.articleRetrieved) score -= 0.18;

  if (input.independentSourceCount >= 3) score += 0.18;
  else if (input.independentSourceCount === 2) score += 0.12;
  else if (input.independentSourceCount <= 1) score -= 0.08;

  if (input.hasPublicationDate) score += 0.06;
  if (input.isRecent) score += 0.05;
  if (input.hasContradictions) score -= 0.25;

  return clamp(Number(score.toFixed(3)), 0, 1);
}

export function evidenceStatusFromSignals(args: {
  independentArticleSources: number;
  bestTier: SourceTier;
  hasContradictions: boolean;
  retrievalFailed: boolean;
  searchSnippetOnly: boolean;
}): EvidenceStatus {
  if (args.retrievalFailed || args.independentArticleSources === 0) {
    return "INSUFFICIENT_EVIDENCE";
  }
  if (args.hasContradictions) return "CONFLICTING";
  if (args.bestTier === 1 && args.independentArticleSources >= 1) return "OFFICIAL";
  if (args.independentArticleSources >= 2) return "CORROBORATED";
  if (args.independentArticleSources === 1 && args.searchSnippetOnly) return "REPORTED";
  if (args.independentArticleSources === 1) return "REPORTED";
  return "UNVERIFIED";
}

export function evidenceStatusLabel(status: EvidenceStatus): string {
  switch (status) {
    case "OFFICIAL":
      return "Official";
    case "VERIFIED":
      return "Verified";
    case "CORROBORATED":
      return "Corroborated";
    case "REPORTED":
      return "Reported";
    case "CONFLICTING":
      return "Conflicting";
    case "INSUFFICIENT_EVIDENCE":
      return "Insufficient evidence";
    case "UNVERIFIED":
    default:
      return "Unverified";
  }
}

export function evidenceStatusEmoji(status: EvidenceStatus): string {
  switch (status) {
    case "OFFICIAL":
      return "🔵";
    case "VERIFIED":
    case "CORROBORATED":
      return "🟢";
    case "REPORTED":
      return "🟡";
    case "CONFLICTING":
      return "🟠";
    case "INSUFFICIENT_EVIDENCE":
    case "UNVERIFIED":
    default:
      return "⚪";
  }
}

export function legacyNewsLabelFromStatus(status: EvidenceStatus): string {
  switch (status) {
    case "OFFICIAL":
    case "VERIFIED":
    case "CORROBORATED":
      return "Verified";
    case "REPORTED":
      return "Developing";
    case "CONFLICTING":
      return "Disputed";
    case "INSUFFICIENT_EVIDENCE":
    case "UNVERIFIED":
    default:
      return "Unverified";
  }
}
