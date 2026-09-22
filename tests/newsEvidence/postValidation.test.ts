import { describe, expect, it } from "vitest";
import {
  enforceNewsEvidenceIntegrity,
  insufficientEvidenceFallback,
  isNewsBrushOffAnswer,
} from "../../convex/newsEvidence/postValidation";
import { GHANA_NEWS_INSUFFICIENT_EVIDENCE } from "../../convex/newsEvidence/userContextRouting";
import { buildNewsEvidencePackage } from "../../convex/newsEvidence/pipeline";
import { MTN_HEROES_OF_CHANGE_FIXTURE } from "./userContextRouting.test";

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

    expect(result.content).toBe(GHANA_NEWS_INSUFFICIENT_EVIDENCE);
    expect(result.content).not.toContain("Parliament passes");
    expect(result.flags).toContain("news_insufficient_evidence");
  });

  it("replaces the Ghana check-the-news hedge when nothing was retrieved", () => {
    const query = "What is happening in Ghana";
    const evidence = buildNewsEvidencePackage({
      query,
      capability: "ghana_news",
      sources: [],
      pagesReadUrls: [],
      warnings: ["Search failed"],
      liveSearchUsed: false,
      retrievalFailed: true,
    });
    const hedge =
      "For the latest news and events happening in Ghana, I recommend checking trusted news sources or online platforms that provide real-time updates. If you have specific areas of interest or topics you're curious about, feel free to let me know, and I can provide information or context based on general knowledge.";

    expect(isNewsBrushOffAnswer(hedge)).toBe(true);
    const result = enforceNewsEvidenceIntegrity({
      answer: hedge,
      query,
      evidence,
      isNewsQuery: true,
    });

    expect(result.content).toBe(GHANA_NEWS_INSUFFICIENT_EVIDENCE);
    expect(result.content).not.toContain("recommend checking");
    expect(result.flags).toContain("news_insufficient_evidence");
  });

  it("replaces a brush-off with the reports that were actually retrieved", () => {
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
      answer:
        "For the latest news, I recommend checking trusted news sources. I can only answer from general knowledge.",
      query: "What is happening in Ghana",
      evidence,
      isNewsQuery: true,
    });

    expect(result.flags).toContain("news_brushoff_replaced");
    expect(result.content).toContain("Parliament opens new session in Accra");
    expect(result.content).toContain("graphic.com.gh");
    expect(result.content).not.toContain("recommend checking");
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

  it("recovers user-provided MTN announcement when model emits generic retrieval failure", () => {
    const evidence = buildNewsEvidencePackage({
      query: MTN_HEROES_OF_CHANGE_FIXTURE,
      capability: "live_web",
      sources: [],
      pagesReadUrls: [],
      warnings: ["Search failed"],
      liveSearchUsed: false,
      retrievalFailed: true,
    });

    const result = enforceNewsEvidenceIntegrity({
      answer: insufficientEvidenceFallback(MTN_HEROES_OF_CHANGE_FIXTURE),
      query: MTN_HEROES_OF_CHANGE_FIXTURE,
      evidence,
      isNewsQuery: true,
    });

    expect(result.content).not.toContain("couldn't retrieve enough current evidence");
    expect(result.content).toMatch(/19 October 2026/i);
    expect(result.flags).toContain("news_user_context_recovery");
  });
});
