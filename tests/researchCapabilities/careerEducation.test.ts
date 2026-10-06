import { describe, expect, it } from "vitest";
import {
  queryNeedsLiveWeb,
  resolveResearchCapability,
  shouldEnableCareerOrEducationResearch,
} from "../../convex/researchCapabilities";
import { shouldEnableWebSearch } from "../../convex/providerRouter";

const MPHIL_QUERY =
  "Which MPhil in applied statistics — data science or medical statistics — is more marketable?";

describe("career and education live web routing", () => {
  it("detects career and academic program research intent", () => {
    expect(shouldEnableCareerOrEducationResearch(MPHIL_QUERY)).toBe(true);
    expect(shouldEnableCareerOrEducationResearch("hello")).toBe(false);
  });

  it("resolves live_web capability for program comparison questions", () => {
    expect(
      resolveResearchCapability({
        query: MPHIL_QUERY,
        liveWebEnabled: false,
      })
    ).toBe("live_web");
  });

  it("enables live web research for career guidance", () => {
    expect(
      queryNeedsLiveWeb({
        query: MPHIL_QUERY,
        capability: "live_web",
      })
    ).toBe(true);
  });

  it("enables provider web search for career guidance", () => {
    expect(shouldEnableWebSearch(MPHIL_QUERY, "general")).toBe(true);
  });
});
