/**
 * Rule-based recommendation engine — v1 (no AI rerank).
 * TODO(v2): optional AI rerank using RECOMMENDATION_PROMPT + user context.
 */
import type { GigaEntitlements } from "./entitlements";
import { computeEntitlements, hasFeature } from "./entitlements";
import {
  chatSurfaceCandidates,
  lowCreditCandidate,
  RECOMMENDATION_PROMPT,
  type RecommendationCandidate,
  type RecommendationEntitlement,
  type RecommendationItem,
  type RecommendationSurface,
} from "./recommendationsCatalog";
import { surfaceDefaults } from "./recommendationsSurfaces";

export {
  RECOMMENDATION_PROMPT,
  type RecommendationEntitlement,
  type RecommendationItem,
  type RecommendationSurface,
};

function finalizeCandidates(
  candidates: RecommendationCandidate[],
  entitlements: GigaEntitlements | null,
  limit: number
): RecommendationItem[] {
  const weighted = [...candidates].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  const out: RecommendationItem[] = [];
  const seen = new Set<string>();

  for (const candidate of weighted) {
    if (out.length >= limit) break;
    const key = `${candidate.action}:${candidate.title}`;
    if (seen.has(key)) continue;

    const allowed =
      !candidate.requiredFeature ||
      !entitlements ||
      hasFeature(entitlements, candidate.requiredFeature);

    out.push({
      title: candidate.title,
      action: candidate.action,
      prompt: candidate.prompt,
      reason: candidate.reason,
      entitlement: allowed ? "free" : "pro",
      personaId: candidate.personaId,
    });
    seen.add(key);

    if (!allowed && candidate.freeAlternative && out.length < limit) {
      const alt = candidate.freeAlternative;
      const altKey = `${alt.action}:${alt.title}`;
      if (!seen.has(altKey)) {
        out.push({ ...alt, entitlement: "free" });
        seen.add(altKey);
      }
    }
  }

  return out.slice(0, limit);
}

export function buildRecommendations(args: {
  surface: RecommendationSurface;
  currentPersonaId?: string | null;
  limit: number;
  entitlements: GigaEntitlements | null;
  creditsLeft: number | null;
  recentTopics: string[];
}): RecommendationItem[] {
  const limit = Math.min(Math.max(args.limit, 1), 8);
  let candidates =
    args.surface === "chat"
      ? chatSurfaceCandidates(args.currentPersonaId ?? undefined, args.recentTopics)
      : surfaceDefaults(args.surface);

  if (args.creditsLeft !== null && args.creditsLeft < 10) {
    candidates = [lowCreditCandidate(), ...candidates];
  }

  return finalizeCandidates(candidates, args.entitlements, limit);
}

export function entitlementsFromUserRow(user: {
  subscriptionPlan?: string | null;
  subscriptionExpiresAt?: number | null;
  credits?: number | null;
  hasPurchasedCredits?: boolean;
}): GigaEntitlements {
  return computeEntitlements(user);
}
