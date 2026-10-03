import { describe, expect, it } from "vitest";
import { buildNewsEvidencePackage } from "../../convex/newsEvidence/pipeline";
import { enforceNewsEvidenceIntegrity } from "../../convex/newsEvidence/postValidation";
import {
  contractHasSnippetOnlyEvidence,
  renderCleanNewsContractSummary,
  sanitizeLiveWebUserAnswer,
  selectPresentationSources,
  snippetOnlyEvidenceNote,
  sortSourcesForRecency,
} from "../../convex/newsEvidence/userPresentation";
import { classifyNewsQuery } from "../../convex/newsEvidence/queryClassification";
import type { ValidatedSource } from "../../convex/newsEvidence/types";

function source(partial: Partial<ValidatedSource> & Pick<ValidatedSource, "publisher" | "url" | "domain">): ValidatedSource {
  return {
    title: partial.title ?? partial.publisher,
    tier: partial.tier ?? 3,
    publicationTimestamp: partial.publicationTimestamp,
    retrievedAt: partial.retrievedAt ?? Date.now(),
    excerpt: partial.excerpt,
    articleRetrieved: partial.articleRetrieved ?? false,
    searchResultOnly: partial.searchResultOnly ?? true,
    articleContentValidated: partial.articleContentValidated ?? false,
    extractionStatus: partial.extractionStatus ?? "snippet_only",
    ...partial,
  };
}

describe("userPresentation", () => {
  it("deduplicates sources by publisher and prefers official tier", () => {
    const classification = classifyNewsQuery("latest Ghana news today");
    const selected = selectPresentationSources(
      [
        source({ publisher: "Reuters", domain: "reuters.com", url: "https://reuters.com/a", tier: 2 }),
        source({ publisher: "Reuters", domain: "reuters.com", url: "https://reuters.com/b", tier: 2 }),
        source({
          publisher: "Ministry of Finance, Ghana",
          domain: "mofep.gov.gh",
          url: "https://mofep.gov.gh/a",
          tier: 1,
        }),
      ],
      classification
    );

    expect(selected).toHaveLength(2);
    expect(selected[0]?.domain).toBe("mofep.gov.gh");
    expect(selected.some((s) => s.publisher === "Reuters")).toBe(true);
  });

  it("sorts sources by recency for latest-news queries", () => {
    const classification = classifyNewsQuery("latest Ghana economy news");
    const sorted = sortSourcesForRecency(
      [
        source({
          publisher: "Older",
          domain: "older.example",
          url: "https://older.example/a",
          publicationTimestamp: "2024-01-01",
        }),
        source({
          publisher: "Recent",
          domain: "recent.example",
          url: "https://recent.example/b",
          publicationTimestamp: "2026-08-25",
        }),
      ],
      classification
    );

    expect(sorted[0]?.publisher).toBe("Recent");
  });

  it("renders clean source links without confidence diagnostics", () => {
    const evidence = buildNewsEvidencePackage({
      query: "What is Ghana",
      capability: "live_web",
      sources: [
        {
          title: "Ghana country profile",
          uri: "https://www.britannica.com/place/Ghana",
          domain: "britannica.com",
          excerpt: "Ghana is a country in West Africa.",
          accessedAt: Date.now(),
        },
        {
          title: "Ghana economy update",
          uri: "https://www.reuters.com/world/africa/ghana",
          domain: "reuters.com",
          excerpt: "Reuters reported on fiscal policy.",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: [],
      warnings: [],
      liveSearchUsed: true,
    });

    const rendered = renderCleanNewsContractSummary(evidence.contract);
    expect(rendered).toContain("**Sources**");
    expect(rendered).toContain("[Britannica]");
    expect(rendered).not.toMatch(/Confidence:/i);
    expect(rendered).not.toMatch(/Why:/i);
    expect(rendered).not.toMatch(/tier \d/i);
  });

  it("adds a single snippet-only evidence note when needed", () => {
    const evidence = buildNewsEvidencePackage({
      query: "latest Ghana news",
      capability: "ghana_news",
      sources: [
        {
          title: "Accra update",
          uri: "https://citinewsroom.com/a",
          domain: "citinewsroom.com",
          excerpt: "Traffic delays reported",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: [],
      warnings: [],
      liveSearchUsed: true,
    });

    expect(contractHasSnippetOnlyEvidence(evidence.contract)).toBe(true);
    const rendered = renderCleanNewsContractSummary(evidence.contract);
    expect(rendered).toContain(snippetOnlyEvidenceNote());
    expect(rendered.split(snippetOnlyEvidenceNote()).length).toBe(2);
  });

  it("sanitizes internal retrieval labels from model text", () => {
    const cleaned = sanitizeLiveWebUserAnswer(
      "**Reported** — Ghana is in West Africa.\n\nConfidence: Very Low\nWhy: Only search snippets were available.\n\n**Sources**\n- [Britannica](https://www.britannica.com/place/Ghana)"
    );

    expect(cleaned).toContain("Ghana is in West Africa");
    expect(cleaned).toContain("[Britannica]");
    expect(cleaned).not.toMatch(/Confidence:/i);
    expect(cleaned).not.toMatch(/Why:/i);
    expect(cleaned).not.toMatch(/\*\*Reported\*\*/i);
  });

  it("preserves internally computed evidence while cleaning brush-off replacements", () => {
    const evidence = buildNewsEvidencePackage({
      query: "What is happening in Ghana",
      capability: "ghana_news",
      sources: [
        {
          title: "Parliament opens new session in Accra",
          uri: "https://www.graphic.com.gh/parliament-session",
          domain: "graphic.com.gh",
          excerpt: "The House began a new sitting.",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: ["https://www.graphic.com.gh/parliament-session"],
      warnings: [],
      liveSearchUsed: true,
    });

    const result = enforceNewsEvidenceIntegrity({
      answer: "For the latest news, check trusted news sources.",
      query: "What is happening in Ghana",
      evidence,
      isNewsQuery: true,
    });

    expect(result.content).toContain("Parliament opens new session in Accra");
    expect(result.content).not.toMatch(/Confidence:/i);
    expect(result.content).not.toMatch(/Why:/i);
    expect(evidence.contract.stories[0]?.confidenceLabel).toBeTruthy();
    expect(evidence.liveSearchUsed).toBe(true);
  });
});
