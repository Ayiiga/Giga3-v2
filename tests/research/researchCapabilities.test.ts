import { describe, expect, it } from "vitest";
import {
  buildGhanaNewsSearchQuery,
  buildResearchSearchQuery,
  detectFactCheckIntent,
  detectGhanaNewsIntent,
  detectLocationIntent,
  detectVerifyImageIntent,
  liveSearchUnavailableNewsFallback,
  resolveResearchCapability,
  researchSystemPromptAddon,
  responseBasisForCapability,
  shouldAutoEnableLiveWeb,
  shouldRunLiveWebResearch,
} from "../../convex/researchCapabilities";

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

  it("detects fact-check and verify-image intents", () => {
    expect(detectFactCheckIntent("Fact check this claim about inflation")).toBe(true);
    expect(detectVerifyImageIntent("Verify this screenshot", true)).toBe(true);
    expect(detectLocationIntent("Where am I?")).toBe(true);
  });

  it("resolves explicit research capability", () => {
    expect(
      resolveResearchCapability({
        explicit: "ghana_news",
        query: "hello",
        liveWebEnabled: false,
      })
    ).toBe("ghana_news");
  });

  it("auto-resolves Ghana news from query text", () => {
    expect(
      resolveResearchCapability({
        query: "What's the latest Ghana news today?",
        liveWebEnabled: true,
      })
    ).toBe("ghana_news");
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
});
