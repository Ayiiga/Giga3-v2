import { describe, expect, it } from "vitest";
import {
  computeConfidenceScore,
  confidenceLabelFromScore,
  evidenceStatusFromSignals,
} from "../../convex/newsEvidence/confidence";

describe("news confidence scoring", () => {
  it("scores official multi-source evidence highest", () => {
    const score = computeConfidenceScore({
      tier: 1,
      articleRetrieved: true,
      searchResultOnly: false,
      independentSourceCount: 2,
      hasPublicationDate: true,
      isRecent: true,
      hasContradictions: false,
      isOfficial: true,
    });
    expect(score).toBeGreaterThanOrEqual(0.85);
    expect(confidenceLabelFromScore(score)).toBe("Very High");
  });

  it("caps snippet-only evidence at reported", () => {
    const status = evidenceStatusFromSignals({
      independentArticleSources: 1,
      bestTier: 2,
      hasContradictions: false,
      retrievalFailed: false,
      searchSnippetOnly: true,
    });
    expect(status).toBe("REPORTED");
  });

  it("returns insufficient evidence when retrieval failed", () => {
    expect(
      evidenceStatusFromSignals({
        independentArticleSources: 0,
        bestTier: 3,
        hasContradictions: false,
        retrievalFailed: true,
        searchSnippetOnly: true,
      })
    ).toBe("INSUFFICIENT_EVIDENCE");
  });
});
