import { describe, expect, it } from "vitest";
import {
  buildGhanaNewsSearchQuery,
  buildResearchSearchQuery,
  classifyInformationRequest,
  detectFactCheckIntent,
  detectGhanaNewsIntent,
  detectCurrentEventsIntent,
  detectNewsRetrievalIntent,
  detectLocationIntent,
  detectVerifyImageIntent,
  isConversationalChatQuery,
  liveSearchUnavailableNewsFallback,
  queryNeedsLiveWeb,
  resolveResearchCapability,
  researchSystemPromptAddon,
  responseBasisForCapability,
  shouldAutoEnableLiveWeb,
  shouldRunLiveWebResearch,
  shouldUseConversationalWorker,
} from "../../convex/researchCapabilities";
import { MTN_HEROES_OF_CHANGE_FIXTURE } from "../newsEvidence/userContextRouting.test";

describe("research capability routing", () => {
  it("auto-enables live web for time-sensitive queries", () => {
    expect(shouldAutoEnableLiveWeb("What is the latest news today?")).toBe(true);
    expect(shouldAutoEnableLiveWeb("Explain photosynthesis")).toBe(false);
  });

  it("detects Ghana news intent", () => {
    expect(detectGhanaNewsIntent("What is the latest Ghana news today?")).toBe(true);
    expect(detectGhanaNewsIntent("Breaking news in Accra")).toBe(true);
    expect(detectGhanaNewsIntent("Explain photosynthesis")).toBe(false);
  });

  it("detects general news retrieval intent", () => {
    expect(detectNewsRetrievalIntent("What's the latest news today?")).toBe(true);
    expect(detectNewsRetrievalIntent("Headlines from Ghana")).toBe(true);
    expect(detectNewsRetrievalIntent("What is happening in Ghana and Nepal")).toBe(true);
    expect(detectNewsRetrievalIntent("Explain photosynthesis")).toBe(false);
  });

  it("detects current-events phrasing", () => {
    expect(detectCurrentEventsIntent("What is happening in Ghana and Nepal")).toBe(true);
    expect(detectCurrentEventsIntent("Hello")).toBe(false);
  });

  it("detects fact-check and verify-image intents", () => {
    expect(detectFactCheckIntent("Fact check this claim about inflation")).toBe(true);
    expect(detectVerifyImageIntent("Verify this screenshot", true)).toBe(true);
    expect(detectLocationIntent("Where am I?")).toBe(true);
  });

  it("resolves explicit research capability for news queries only", () => {
    expect(
      resolveResearchCapability({
        explicit: "ghana_news",
        query: "hello",
        liveWebEnabled: false,
      })
    ).toBe("general");
    expect(
      resolveResearchCapability({
        explicit: "ghana_news",
        query: "Latest Ghana headlines today",
        liveWebEnabled: false,
      })
    ).toBe("ghana_news");
  });

  it("skips live web for conversational greetings", () => {
    expect(isConversationalChatQuery("Hello")).toBe(true);
    expect(isConversationalChatQuery("Hello dear")).toBe(true);
    expect(isConversationalChatQuery("What is the latest Ghana news today?")).toBe(
      false
    );
    expect(
      queryNeedsLiveWeb({
        query: "Hi",
        capability: "ghana_news",
        mode: "news",
      })
    ).toBe(false);
    expect(
      queryNeedsLiveWeb({
        query: "Latest Ghana headlines today",
        capability: "ghana_news",
        mode: "news",
      })
    ).toBe(true);
  });

  it("auto-resolves Ghana news from query text", () => {
    expect(
      resolveResearchCapability({
        query: "What's the latest Ghana news today?",
        liveWebEnabled: true,
      })
    ).toBe("ghana_news");
  });

  it("routes 'What is happening in Ghana' to Ghana news, not small talk", () => {
    const query = "What is happening in Ghana";
    expect(isConversationalChatQuery(query)).toBe(false);
    expect(detectGhanaNewsIntent(query)).toBe(true);
    expect(detectCurrentEventsIntent(query)).toBe(true);
    expect(detectNewsRetrievalIntent(query)).toBe(true);
    const capability = resolveResearchCapability({
      query,
      liveWebEnabled: true,
    });
    expect(capability).toBe("ghana_news");
    const needsLiveWeb = queryNeedsLiveWeb({ query, capability });
    expect(needsLiveWeb).toBe(true);
    expect(
      shouldUseConversationalWorker({ needsLiveWeb, attachmentCount: 0 })
    ).toBe(false);
    expect(buildResearchSearchQuery(query, capability)).toContain("graphic.com.gh");
    expect(buildResearchSearchQuery(query, capability)).not.toContain("ghana.gov.gh");
    expect(researchSystemPromptAddon(capability)).toContain("Do not deflect");
  });

  it("auto-resolves breaking Ghana news", () => {
    expect(
      resolveResearchCapability({
        query: "Breaking news in Ghana right now",
        liveWebEnabled: true,
      })
    ).toBe("breaking_news");
  });

  it("auto-resolves fact check from query text", () => {
    expect(
      resolveResearchCapability({
        query: "Is this news real?",
        liveWebEnabled: false,
      })
    ).toBe("fact_check");
  });

  it("builds Ghana-aware search queries", () => {
    expect(buildResearchSearchQuery("updates", "ghana_news")).toContain("Ghana news");
    expect(buildGhanaNewsSearchQuery("updates")).toContain("graphic.com.gh");
    expect(buildResearchSearchQuery("updates", "breaking_news")).toContain("breaking news");
  });

  it("maps capabilities to live web research and response basis", () => {
    expect(shouldRunLiveWebResearch("fact_check")).toBe(true);
    expect(shouldRunLiveWebResearch("ghana_news")).toBe(true);
    expect(shouldRunLiveWebResearch("general")).toBe(false);
    expect(responseBasisForCapability("fact_check", true)).toBe("fact_checked");
    expect(responseBasisForCapability("ghana_news", true)).toBe("current_news");
    expect(responseBasisForCapability("general", false)).toBe("ai_knowledge");
  });

  it("adds capability-specific system prompt guidance", () => {
    expect(researchSystemPromptAddon("fact_check")).toContain("Fact verification");
    expect(researchSystemPromptAddon("breaking_news")).toContain("Breaking news");
    expect(researchSystemPromptAddon("ghana_news")).toContain("Ghana news assistant");
    expect(researchSystemPromptAddon("ghana_news")).toContain("Verified");
  });

  it("provides live-search-unavailable fallback for Ghana news", () => {
    expect(liveSearchUnavailableNewsFallback("ghana_news")).toContain("temporarily unavailable");
    expect(liveSearchUnavailableNewsFallback("ghana_news")).toContain("Unverified");
  });

  it("does not auto-enable live web for pasted MTN announcement user context", () => {
    expect(classifyInformationRequest(MTN_HEROES_OF_CHANGE_FIXTURE)).toBe(
      "answer_from_user_context"
    );
    expect(shouldAutoEnableLiveWeb(MTN_HEROES_OF_CHANGE_FIXTURE)).toBe(false);
    expect(
      queryNeedsLiveWeb({
        query: MTN_HEROES_OF_CHANGE_FIXTURE,
        capability: "general",
      })
    ).toBe(false);
    expect(
      resolveResearchCapability({
        query: MTN_HEROES_OF_CHANGE_FIXTURE,
        liveWebEnabled: true,
      })
    ).toBe("general");
  });

  it("still auto-enables live web for announcement news lookups", () => {
    expect(shouldAutoEnableLiveWeb("Latest announcement from MTN Ghana today")).toBe(true);
  });

  it("does not open Ghana news search for a personal Ghana-today sentence", () => {
    const query = "I visited Ghana today with my family and loved the food";
    expect(detectGhanaNewsIntent(query)).toBe(false);
    expect(detectNewsRetrievalIntent(query)).toBe(false);
    expect(shouldAutoEnableLiveWeb(query)).toBe(false);
    expect(
      resolveResearchCapability({ query, liveWebEnabled: true })
    ).toBe("general");
    expect(queryNeedsLiveWeb({ query, capability: "general" })).toBe(false);
    expect(shouldUseConversationalWorker({
      needsLiveWeb: queryNeedsLiveWeb({ query, capability: "general" }),
      attachmentCount: 0,
    })).toBe(true);
    expect(detectGhanaNewsIntent("What is the latest Ghana news today?")).toBe(true);
    expect(detectNewsRetrievalIntent("What is Ghana's inflation today?")).toBe(true);
    expect(
      resolveResearchCapability({
        query: "What is Ghana's inflation today?",
        liveWebEnabled: true,
      })
    ).toBe("ghana_news");
  });
});
