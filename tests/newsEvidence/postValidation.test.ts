import { describe, expect, it } from "vitest";
import {
  enforceNewsEvidenceIntegrity,
  insufficientEvidenceFallback,
} from "../../convex/newsEvidence/postValidation";
import { buildNewsEvidencePackage } from "../../convex/newsEvidence/pipeline";

describe("news post-validation", () => {
  it("replaces zero-evidence headline answers", () => {
    const evidence = buildNewsEvidencePackage({
      query: "What are the latest Ghana headlines today?",
      capability: "ghana_news",
      sources: [],
      pagesReadUrls: [],
      warnings: ["Search failed"],
      liveSearchUsed: false,
      retrievalFailed: true,
    });

    const result = enforceNewsEvidenceIntegrity({
      answer:
        "**Verified** — Parliament passes new bill.\n\nSource: MyJoyOnline",
      query: evidence.contract.query,
      evidence,
      isNewsQuery: true,
    });

    expect(result.content).toContain("couldn't retrieve enough current evidence");
    expect(result.content).not.toContain("MyJoyOnline");
    expect(result.flags).toContain("news_insufficient_evidence");
  });

  it("downgrades verified labels when only snippets exist", () => {
    const evidence = buildNewsEvidencePackage({
      query: "Latest Accra news",
      capability: "ghana_news",
      sources: [
        {
          title: "Accra traffic update",
          uri: "https://citinewsroom.com/traffic/",
          domain: "citinewsroom.com",
          excerpt: "Traffic delays reported",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: [],
      warnings: [],
      liveSearchUsed: true,
    });

    const result = enforceNewsEvidenceIntegrity({
      answer: "**Verified** — Major traffic delays across Accra today.",
      query: evidence.contract.query,
      evidence,
      isNewsQuery: true,
    });

    expect(result.content).not.toMatch(/\*\*Verified\*\*/);
  });

  it("resolves can't verify then verified contradiction", () => {
    const evidence = buildNewsEvidencePackage({
      query: "Ghana news today",
      capability: "ghana_news",
      sources: [
        {
          title: "Sample story",
          uri: "https://www.myjoyonline.com/x/",
          domain: "myjoyonline.com",
          excerpt: "Sample",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: ["https://www.myjoyonline.com/x/"],
      warnings: [],
      liveSearchUsed: true,
    });

    const result = enforceNewsEvidenceIntegrity({
      answer:
        "I can't confidently verify this request.\n\n**Verified** — Sample story.",
      query: evidence.contract.query,
      evidence,
      isNewsQuery: true,
    });

    expect(result.content).not.toMatch(/can't confidently verify/i);
    expect(result.flags).toContain("news_contradiction_resolved");
  });

  it("provides explicit insufficient-evidence fallback copy", () => {
    expect(insufficientEvidenceFallback("Latest Ghana news")).toMatch(/won't invent/i);
  });
});
