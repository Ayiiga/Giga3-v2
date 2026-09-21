import { describe, expect, it } from "vitest";
import { validateAnswerQuality, prepareAnswerQualityContext } from "../../convex/answerQuality";
import { buildEvidenceContextBlock, buildNewsEvidencePackage } from "../../convex/newsEvidence/pipeline";
import {
  enforceNewsEvidenceIntegrity,
  insufficientEvidenceFallback,
} from "../../convex/newsEvidence/postValidation";
import {
  MTN_FULL_PRODUCTION_ANNOUNCEMENT,
  MTN_HEROES_OF_CHANGE_FIXTURE,
} from "./userContextRouting.test";
import {
  classifyInformationRequest,
  detectAnswerFromUserContextIntent,
} from "../../convex/newsEvidence/userContextRouting";
import {
  buildChatRoutePlan,
  shouldEnableWebSearch,
} from "../../convex/providerRouter";
import {
  detectNewsRetrievalIntent,
  queryNeedsLiveWeb,
  resolveResearchCapability,
  shouldAutoEnableLiveWeb,
} from "../../convex/researchCapabilities";

/** Mirrors chatReplyWorker routing decisions without Convex I/O. */
function simulateChatRouting(args: {
  query: string;
  explicitCapability?: string | null;
  mode?: string;
}) {
  const researchCapability = resolveResearchCapability({
    explicit: args.explicitCapability,
    query: args.query,
    liveWebEnabled: true,
  });
  const infoRequestMode = classifyInformationRequest(args.query);
  const needsLiveWeb = queryNeedsLiveWeb({
    query: args.query,
    capability: researchCapability,
    mode: args.mode ?? "chat",
  });
  const routePlan = buildChatRoutePlan({
    tier: "free",
    mode: args.mode ?? "chat",
    query: args.query,
    hasAttachments: false,
  });
  const forceWebSearch = needsLiveWeb;
  if (forceWebSearch) routePlan.enableWebSearch = true;

  return {
    infoRequestMode,
    researchCapability,
    needsLiveWeb,
    forceWebSearch,
    providerWebSearch: routePlan.enableWebSearch,
    detectNewsRetrievalIntent: detectNewsRetrievalIntent(args.query),
    shouldAutoEnableLiveWeb: shouldAutoEnableLiveWeb(args.query),
  };
}

function simulatePostValidationPipeline(args: {
  query: string;
  modelAnswer: string;
  retrievalFailed?: boolean;
  sources?: Parameters<typeof buildNewsEvidencePackage>[0]["sources"];
}) {
  const evidence = buildNewsEvidencePackage({
    query: args.query,
    capability: "live_web",
    sources: args.sources ?? [],
    pagesReadUrls: [],
    warnings: args.retrievalFailed ? ["Search failed"] : [],
    liveSearchUsed: Boolean(args.sources?.length),
    retrievalFailed: args.retrievalFailed ?? args.sources?.length === 0,
  });
  const context = prepareAnswerQualityContext({ mode: "chat", query: args.query });
  const validated = validateAnswerQuality({
    answer: args.modelAnswer,
    context,
    newsEvidence: evidence,
  });
  return { evidence, validated, evidenceBlock: buildEvidenceContextBlock(evidence) };
}

describe("PR #412 integration — full routing chain", () => {
  it("MODE A: pasted MTN announcement routes to user context, not live web", () => {
    const route = simulateChatRouting({ query: MTN_FULL_PRODUCTION_ANNOUNCEMENT });
    expect(route.infoRequestMode).toBe("answer_from_user_context");
    expect(route.needsLiveWeb).toBe(false);
    expect(route.forceWebSearch).toBe(false);
    expect(route.researchCapability).toBe("general");
    expect(shouldEnableWebSearch(MTN_FULL_PRODUCTION_ANNOUNCEMENT, "chat")).toBe(false);
  });

  it("MODE A: critical acceptance — generic retrieval failure is recovered", () => {
    const { validated } = simulatePostValidationPipeline({
      query: MTN_FULL_PRODUCTION_ANNOUNCEMENT,
      modelAnswer: insufficientEvidenceFallback(MTN_FULL_PRODUCTION_ANNOUNCEMENT),
      retrievalFailed: true,
    });
    expect(validated.content).not.toContain("couldn't retrieve enough current evidence");
    expect(validated.content).toMatch(/19 October 2026/i);
    expect(validated.content).toMatch(/information you provided|user-provided/i);
    expect(validated.content).not.toMatch(/MTN has confirmed|officially verified by MTN/i);
  });

  it("MODE B: verification request enables live web", () => {
    const query = `Is this announcement genuine and current?\n\n${MTN_FULL_PRODUCTION_ANNOUNCEMENT}`;
    const route = simulateChatRouting({ query });
    expect(route.infoRequestMode).toBe("verify_user_content");
    expect(route.needsLiveWeb).toBe(true);
    expect(route.forceWebSearch).toBe(true);
  });

  it("MODE B: verification failure preserves user content via recovery", () => {
    const query = `Is this announcement genuine and current?\n\n${MTN_FULL_PRODUCTION_ANNOUNCEMENT}`;
    const { validated } = simulatePostValidationPipeline({
      query,
      modelAnswer: insufficientEvidenceFallback(query),
      retrievalFailed: true,
    });
    expect(validated.content).not.toContain("couldn't retrieve enough current evidence");
    expect(validated.content).toMatch(/19 October 2026/i);
  });

  it("MODE C: current news without supplied content keeps retrieval fallback", () => {
    const query = "What's the latest Ghana news today?";
    const route = simulateChatRouting({ query });
    expect(route.infoRequestMode).toBe("retrieve_current_news");
    expect(route.needsLiveWeb).toBe(true);
    const { validated } = simulatePostValidationPipeline({
      query,
      modelAnswer: "**Verified** — Fake headline.",
      retrievalFailed: true,
    });
    expect(validated.content).toContain("couldn't retrieve enough current evidence");
  });
});

describe("PR #412 integration — negative tests (news must still work)", () => {
  const newsQueries = [
    "What are the latest Ghana news stories today?",
    "What happened in Ghana this week?",
    "Verify this breaking news report about parliament.",
    "Is this announcement still current?",
    "What is the latest update on this story?",
  ];

  it.each(newsQueries)("%s still enables appropriate retrieval", (query) => {
    const route = simulateChatRouting({ query });
    expect(route.needsLiveWeb).toBe(true);
  });

  it("does not classify explicit news lookup as user context", () => {
    expect(detectAnswerFromUserContextIntent("What are the latest Ghana news stories today?")).toBe(
      false
    );
  });
});

describe("PR #412 integration — prompt contract", () => {
  it("empty evidence with user paste no longer says ONLY from evidence package", () => {
    const evidence = buildNewsEvidencePackage({
      query: MTN_FULL_PRODUCTION_ANNOUNCEMENT,
      capability: "live_web",
      sources: [],
      pagesReadUrls: [],
      warnings: ["Search failed"],
      liveSearchUsed: false,
      retrievalFailed: true,
    });
    const block = buildEvidenceContextBlock(evidence);
    expect(block).toContain("User-provided content mode");
    expect(block).not.toContain("ONLY from this evidence package");
  });
});

describe("PR #412 integration — ordinary chat", () => {
  const ordinary = [
    "Explain this paragraph: The cat sat on the mat.",
    "Summarize this text about photosynthesis in plants.",
    "What does this announcement mean?",
    "Extract the important dates from this notice.",
    "Rewrite this message in simpler language.",
  ];

  it.each(ordinary)("'%s' does not force live web", (query) => {
    const route = simulateChatRouting({ query });
    expect(route.needsLiveWeb).toBe(false);
  });
});

describe("PR #412 integration — provider fallback preserves routing", () => {
  it("free tier failover order is gemini then fal_ai", () => {
    const plan = buildChatRoutePlan({
      tier: "free",
      mode: "chat",
      query: MTN_FULL_PRODUCTION_ANNOUNCEMENT,
      hasAttachments: false,
    });
    expect(plan.failoverOrder).toEqual(["gemini", "fal_ai"]);
    expect(plan.enableWebSearch).toBe(false);
  });

  it("premium tier failover includes openai and gemini", () => {
    const plan = buildChatRoutePlan({
      tier: "premium",
      mode: "chat",
      query: "What's the latest Ghana news today?",
      hasAttachments: false,
    });
    expect(plan.failoverOrder[0]).toBe("openai_primary");
    expect(plan.enableWebSearch).toBe(true);
  });
});

describe("PR #412 integration — successful external search on verify", () => {
  it("uses external evidence without claiming MTN confirmed user paste", () => {
    const query = `Verify whether this announcement is current.\n\n${MTN_HEROES_OF_CHANGE_FIXTURE}`;
    const evidence = buildNewsEvidencePackage({
      query,
      capability: "ghana_news",
      sources: [
        {
          title: "MTN Heroes of Change opens nominations",
          uri: "https://www.myjoyonline.com/mtn-heroes/",
          domain: "myjoyonline.com",
          excerpt: "MTN Ghana opened Season 8 nominations.",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: ["https://www.myjoyonline.com/mtn-heroes/"],
      warnings: [],
      liveSearchUsed: true,
      retrievalFailed: false,
    });
    const enforced = enforceNewsEvidenceIntegrity({
      answer:
        "According to MyJoyOnline, MTN Ghana opened Season 8 nominations. The message you shared mentions a 19 October 2026 deadline.",
      query,
      evidence,
      isNewsQuery: true,
    });
    expect(enforced.content).toMatch(/MyJoyOnline|message you shared/i);
    expect(enforced.content).not.toMatch(/\*\*Verified\*\*/);
  });
});

describe("PR #412 integration — ghana_news persona edge case", () => {
  it("capability stays ghana_news but live web and empty news evidence stay off", () => {
    const route = simulateChatRouting({
      query: MTN_FULL_PRODUCTION_ANNOUNCEMENT,
      explicitCapability: "ghana_news",
    });
    expect(route.researchCapability).toBe("ghana_news");
    expect(route.infoRequestMode).toBe("answer_from_user_context");
    expect(route.needsLiveWeb).toBe(false);
    const context = prepareAnswerQualityContext({
      mode: "news",
      query: MTN_FULL_PRODUCTION_ANNOUNCEMENT,
    });
    const validated = validateAnswerQuality({
      answer: "The announcement you shared says nominations close on 19 October 2026.",
      context,
      newsEvidence: null,
    });
    expect(validated.content).toMatch(/announcement you shared|19 October 2026/i);
  });
});
