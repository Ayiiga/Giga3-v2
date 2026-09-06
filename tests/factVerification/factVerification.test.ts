import { describe, expect, it } from "vitest";
import {
  extractClaimFromQuery,
  formatVerificationContextBlock,
} from "../../convex/factVerification";

describe("fact verification helpers", () => {
  it("extracts quoted claims", () => {
    expect(extractClaimFromQuery('Fact check "Ghana won the match"')).toBe(
      "Ghana won the match"
    );
  });

  it("formats verification context with sources", () => {
    const block = formatVerificationContextBlock({
      verdict: "insufficient_evidence",
      confidence: "low",
      summary: "Not enough evidence.",
      reasons: ["No primary source found"],
      claim: "Example claim",
      trustedSources: [{ title: "Example", uri: "https://example.com" }],
      checkedAt: Date.now(),
    });
    expect(block).toContain("FACT VERIFICATION CONTEXT");
    expect(block).toContain("insufficient_evidence");
    expect(block).toContain("https://example.com");
  });
});
