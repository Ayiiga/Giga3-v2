import { describe, expect, it } from "vitest";
import {
  buildNewsEvidencePackage,
  validateLiveWebSource,
} from "../../convex/newsEvidence/pipeline";

describe("news evidence pipeline", () => {
  it("marks search snippets as not article-retrieved", () => {
    const validated = validateLiveWebSource({
      source: {
        title: "Port congestion action ordered",
        uri: "https://www.myjoyonline.com/example/",
        domain: "myjoyonline.com",
        excerpt: "Transport Minister directs action...",
        accessedAt: Date.now(),
      },
      pagesReadUrls: new Set(),
    });
    expect(validated.searchResultOnly).toBe(true);
    expect(validated.articleRetrieved).toBe(false);
    expect(validated.extractionStatus).toBe("snippet_only");
  });

  it("clusters duplicate wire headlines", () => {
    const evidence = buildNewsEvidencePackage({
      query: "Compare reports on port congestion in Ghana",
      capability: "ghana_news",
      sources: [
        {
          title: "Minister orders port congestion fix",
          uri: "https://www.myjoyonline.com/a/",
          domain: "myjoyonline.com",
          excerpt: "Minister orders action",
          accessedAt: Date.now(),
        },
        {
          title: "Minister orders port congestion fix - GhanaWeb",
          uri: "https://www.ghanaweb.com/b/",
          domain: "ghanaweb.com",
          excerpt: "Minister orders action",
          accessedAt: Date.now(),
        },
        {
          title: "Black Stars squad named",
          uri: "https://citinewsroom.com/c/",
          domain: "citinewsroom.com",
          excerpt: "Squad list published",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: ["https://www.myjoyonline.com/a/"],
      warnings: [],
      liveSearchUsed: true,
    });

    expect(evidence.contract.evidenceCount).toBe(3);
    expect(evidence.contract.stories.length).toBeGreaterThanOrEqual(2);
    expect(evidence.contract.articleRetrievedCount).toBe(1);
  });

  it("flags comparison when only one cluster exists", () => {
    const evidence = buildNewsEvidencePackage({
      query: "Compare reports on the port congestion story",
      capability: "ghana_news",
      sources: [
        {
          title: "Port congestion update",
          uri: "https://www.myjoyonline.com/only/",
          domain: "myjoyonline.com",
          excerpt: "Only one report",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: [],
      warnings: [],
      liveSearchUsed: true,
    });

    expect(evidence.contract.missingInformation[0]).toMatch(/one accessible/i);
  });
});
