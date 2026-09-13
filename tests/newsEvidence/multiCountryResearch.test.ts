import { describe, expect, it } from "vitest";
import {
  buildMultiCountryNewsEvidencePackage,
  buildNewsEvidencePackage,
} from "../../convex/newsEvidence/pipeline";
import { enforceNewsEvidenceIntegrity } from "../../convex/newsEvidence/postValidation";
import {
  classifyNewsQuery,
  extractRequestedCountries,
  sourceMatchesRequestedCountry,
} from "../../convex/newsEvidence/queryClassification";
import {
  buildCountryResearchSearchQuery,
  queryNeedsLiveWeb,
} from "../../convex/researchCapabilities";
import { shouldUseQuickConversationalReply } from "../../web/lib/chat/quickReplyRouting";

describe("extractRequestedCountries", () => {
  it("detects Ghana and Nepal in one query", () => {
    expect(
      extractRequestedCountries("What is happening in Ghana and Nepal?")
    ).toEqual(["Ghana", "Nepal"]);
  });

  it("returns a single country when only one is mentioned", () => {
    expect(extractRequestedCountries("Latest Ghana news today")).toEqual(["Ghana"]);
  });
});

describe("classifyNewsQuery multi-country", () => {
  it("records all requested countries", () => {
    const classified = classifyNewsQuery("What is happening in Ghana and Nepal?");
    expect(classified.countries).toEqual(["Ghana", "Nepal"]);
    expect(classified.country).toBe("Ghana");
    expect(classified.requiresRetrieval).toBe(true);
  });
});

describe("buildCountryResearchSearchQuery", () => {
  it("builds focused Ghana search for Ghana section", () => {
    const query = buildCountryResearchSearchQuery(
      "Ghana",
      "What is happening in Ghana and Nepal?",
      "ghana_news"
    );
    expect(query.toLowerCase()).toContain("ghana");
    expect(query.toLowerCase()).toContain("site:");
  });

  it("builds focused Nepal search without Ghana site bias", () => {
    const query = buildCountryResearchSearchQuery(
      "Nepal",
      "What is happening in Ghana and Nepal?",
      "live_web"
    );
    expect(query.toLowerCase()).toContain("nepal");
    expect(query.toLowerCase()).not.toContain("site:myjoyonline.com");
  });
});

describe("buildMultiCountryNewsEvidencePackage", () => {
  const ghanaSource = {
    title: "Ghana inflation update",
    uri: "https://www.myjoyonline.com/ghana-inflation/",
    domain: "myjoyonline.com",
    excerpt: "Ghana inflation falls in latest reading",
    accessedAt: Date.now(),
  };

  const nepalSource = {
    title: "Nepal parliament session update",
    uri: "https://kathmandupost.com/nepal-politics/",
    domain: "kathmandupost.com",
    excerpt: "Nepal parliament convenes on budget debate",
    accessedAt: Date.now(),
  };

  it("groups evidence by country and keeps both sections", () => {
    const evidence = buildMultiCountryNewsEvidencePackage({
      query: "What is happening in Ghana and Nepal?",
      capability: "live_web",
      countries: ["Ghana", "Nepal"],
      sources: [ghanaSource, nepalSource],
      pagesReadUrls: [ghanaSource.uri, nepalSource.uri],
      warnings: [],
      liveSearchUsed: true,
    });

    expect(evidence.contract.countrySections).toHaveLength(2);
    expect(evidence.retrievalFailed).toBe(false);
    expect(
      evidence.contract.countrySections?.find((s) => s.country === "Ghana")?.retrievalFailed
    ).toBe(false);
    expect(
      evidence.contract.countrySections?.find((s) => s.country === "Nepal")?.retrievalFailed
    ).toBe(false);
  });

  it("allows partial failure when one country has no evidence", () => {
    const evidence = buildMultiCountryNewsEvidencePackage({
      query: "What is happening in Ghana and Nepal?",
      capability: "live_web",
      countries: ["Ghana", "Nepal"],
      sources: [ghanaSource],
      pagesReadUrls: [ghanaSource.uri],
      warnings: ["Nepal: search failed (timeout)"],
      countryWarnings: {
        Nepal: ["Nepal: search failed (timeout)"],
      },
      liveSearchUsed: true,
    });

    const ghana = evidence.contract.countrySections?.find((s) => s.country === "Ghana");
    const nepal = evidence.contract.countrySections?.find((s) => s.country === "Nepal");

    expect(evidence.retrievalFailed).toBe(false);
    expect(ghana?.retrievalFailed).toBe(false);
    expect(ghana?.stories.length).toBeGreaterThan(0);
    expect(nepal?.retrievalFailed).toBe(true);
    expect(nepal?.confidenceLabel).toBe("Unavailable");
    expect(evidence.contract.missingInformation.some((m) => m.includes("Nepal"))).toBe(true);
  });
});

describe("enforceNewsEvidenceIntegrity partial country evidence", () => {
  it("does not replace the whole answer when one country succeeded", () => {
    const evidence = buildMultiCountryNewsEvidencePackage({
      query: "What is happening in Ghana and Nepal?",
      capability: "live_web",
      countries: ["Ghana", "Nepal"],
      sources: [
        {
          title: "Ghana economy update",
          uri: "https://www.myjoyonline.com/economy/",
          domain: "myjoyonline.com",
          excerpt: "Ghana economy update",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: [],
      warnings: ["Nepal: search failed (503)"],
      countryWarnings: { Nepal: ["Nepal: search failed (503)"] },
      liveSearchUsed: true,
    });

    const result = enforceNewsEvidenceIntegrity({
      answer: "## Ghana\n- Economy update [source](https://www.myjoyonline.com/economy/)\n\n## Nepal\nI couldn't verify a sufficiently reliable current update for Nepal.",
      query: "What is happening in Ghana and Nepal?",
      evidence,
      isNewsQuery: true,
    });

    expect(result.content).toContain("## Ghana");
    expect(result.content).not.toContain("I couldn't retrieve enough current evidence");
  });

  it("still falls back when every country lacks evidence", () => {
    const evidence = buildMultiCountryNewsEvidencePackage({
      query: "What is happening in Ghana and Nepal?",
      capability: "live_web",
      countries: ["Ghana", "Nepal"],
      sources: [],
      pagesReadUrls: [],
      warnings: ["Ghana: search failed", "Nepal: search failed"],
      countryWarnings: {
        Ghana: ["Ghana: search failed"],
        Nepal: ["Nepal: search failed"],
      },
      liveSearchUsed: false,
    });

    const result = enforceNewsEvidenceIntegrity({
      answer: "## Ghana\nMade up headline",
      query: "What is happening in Ghana and Nepal?",
      evidence,
      isNewsQuery: true,
    });

    expect(result.content).toContain("couldn't retrieve enough current evidence");
    expect(result.flags).toContain("news_insufficient_evidence");
  });
});

describe("sourceMatchesRequestedCountry", () => {
  it("matches Ghana and Nepal domains separately", () => {
    expect(
      sourceMatchesRequestedCountry(
        {
          title: "Budget debate",
          uri: "https://kathmandupost.com/budget/",
          domain: "kathmandupost.com",
        },
        "Nepal"
      )
    ).toBe(true);
    expect(
      sourceMatchesRequestedCountry(
        {
          title: "Budget debate",
          uri: "https://kathmandupost.com/budget/",
          domain: "kathmandupost.com",
        },
        "Ghana"
      )
    ).toBe(false);
  });
});

describe("normal chat remains untouched", () => {
  it("does not route Hello Sir through live web research", () => {
    expect(
      shouldUseQuickConversationalReply({ query: "Hello Sir" })
    ).toBe(true);
    expect(
      queryNeedsLiveWeb({
        query: "Hello Sir",
        capability: "general",
      })
    ).toBe(false);
  });

  it("does not classify Hello Sir as news retrieval", () => {
    expect(classifyNewsQuery("Hello Sir").requiresRetrieval).toBe(false);
  });
});

describe("single-country Ghana news package remains compatible", () => {
  it("builds a standard Ghana evidence package", () => {
    const evidence = buildNewsEvidencePackage({
      query: "What is the latest Ghana news today?",
      capability: "ghana_news",
      sources: [
        {
          title: "Parliament update",
          uri: "https://www.myjoyonline.com/parliament/",
          domain: "myjoyonline.com",
          excerpt: "Parliament reconvenes",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: [],
      warnings: [],
      liveSearchUsed: true,
    });

    expect(evidence.contract.countrySections).toBeUndefined();
    expect(evidence.contract.stories.length).toBeGreaterThan(0);
    expect(evidence.retrievalFailed).toBe(false);
  });
});
