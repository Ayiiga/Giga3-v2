import { describe, expect, it } from "vitest";
import {
  buildNewsEvidencePackage,
  buildEvidenceContextBlock,
} from "../../convex/newsEvidence/pipeline";
import {
  enforceNewsEvidenceIntegrity,
  insufficientEvidenceFallback,
} from "../../convex/newsEvidence/postValidation";
import {
  buildUserContextRecoveryAnswer,
  classifyInformationRequest,
  detectAnswerFromUserContextIntent,
  detectVerifyUserContentIntent,
  hasSubstantiveUserProvidedContent,
} from "../../convex/newsEvidence/userContextRouting";
import {
  queryNeedsLiveWeb,
  resolveResearchCapability,
  shouldAutoEnableLiveWeb,
} from "../../convex/researchCapabilities";
import { shouldEnableWebSearch } from "../../convex/providerRouter";
import { validateAnswerQuality, prepareAnswerQualityContext } from "../../convex/answerQuality";

export const MTN_HEROES_OF_CHANGE_FIXTURE =
  "MTN Ghana Heroes of Change Season 8 is open for nominations until 19 October 2026. The overall winner receives GHS400,000 and each category winner receives GHS200,000. Categories include Education, Health, Economic Empowerment, Sustainability and Digital Innovation. Nominate via the MTN Ghana website or MTN Service Centres.";

/** Production-reported user paste including marketing "today" and Ghana references. */
export const MTN_FULL_PRODUCTION_ANNOUNCEMENT =
  "Dear Valued Customer, Nominations for Heroes of Change Season 8 will close on 19 October 2026. Do you know someone doing extraordinary work in your community in Education, Health and Economic Empowerment? Nominate your hero now! The overall winner will receive GHS400,000, and each category winner will receive GHS200,000. Nominators of the 10 finalists will also be rewarded, including outstanding contributions in Sustainability and Digital Innovation. Hurry, nominate your hero today! Visit MTN Ghana's website - www.mtn.com.gh and nominate or drop off the nomination at any MTN Service Center.";

describe("user context routing — MTN Heroes of Change regression", () => {
  it("production MTN paste with 'today' and Ghana is user context, not news lookup", () => {
    expect(classifyInformationRequest(MTN_FULL_PRODUCTION_ANNOUNCEMENT)).toBe(
      "answer_from_user_context"
    );
    expect(queryNeedsLiveWeb({
      query: MTN_FULL_PRODUCTION_ANNOUNCEMENT,
      capability: "general",
    })).toBe(false);
    expect(
      enforceNewsEvidenceIntegrity({
        answer: insufficientEvidenceFallback(MTN_FULL_PRODUCTION_ANNOUNCEMENT),
        query: MTN_FULL_PRODUCTION_ANNOUNCEMENT,
        evidence: buildNewsEvidencePackage({
          query: MTN_FULL_PRODUCTION_ANNOUNCEMENT,
          capability: "live_web",
          sources: [],
          pagesReadUrls: [],
          warnings: ["Search failed"],
          liveSearchUsed: false,
          retrievalFailed: true,
        }),
        isNewsQuery: true,
      }).content
    ).not.toContain("couldn't retrieve enough current evidence");
  });

  it("Case 1: complete pasted announcement is treated as user context, not live news lookup", () => {
    expect(hasSubstantiveUserProvidedContent(MTN_HEROES_OF_CHANGE_FIXTURE)).toBe(true);
    expect(detectAnswerFromUserContextIntent(MTN_HEROES_OF_CHANGE_FIXTURE)).toBe(true);
    expect(classifyInformationRequest(MTN_HEROES_OF_CHANGE_FIXTURE)).toBe(
      "answer_from_user_context"
    );
    expect(shouldAutoEnableLiveWeb(MTN_HEROES_OF_CHANGE_FIXTURE)).toBe(false);
    expect(
      resolveResearchCapability({
        query: MTN_HEROES_OF_CHANGE_FIXTURE,
        liveWebEnabled: true,
      })
    ).toBe("general");
    expect(
      queryNeedsLiveWeb({
        query: MTN_HEROES_OF_CHANGE_FIXTURE,
        capability: "general",
      })
    ).toBe(false);
    expect(shouldEnableWebSearch(MTN_HEROES_OF_CHANGE_FIXTURE, "chat")).toBe(false);
  });

  it("Case 2: summarize supplied announcement does not require live web", () => {
    const query = `Please summarize this announcement:\n\n${MTN_HEROES_OF_CHANGE_FIXTURE}`;
    expect(classifyInformationRequest(query)).toBe("answer_from_user_context");
    expect(queryNeedsLiveWeb({ query, capability: "general" })).toBe(false);
  });

  it("Case 3: question about supplied announcement answers from user context", () => {
    const query = `What date does this message say nominations close?\n\n${MTN_HEROES_OF_CHANGE_FIXTURE}`;
    expect(classifyInformationRequest(query)).toBe("answer_from_user_context");
    expect(queryNeedsLiveWeb({ query, capability: "general" })).toBe(false);
  });

  it("Case 4: verification request attempts external retrieval", () => {
    const query = `Is this announcement still current and genuine?\n\n${MTN_HEROES_OF_CHANGE_FIXTURE}`;
    expect(detectVerifyUserContentIntent(query)).toBe(true);
    expect(classifyInformationRequest(query)).toBe("verify_user_content");
    expect(queryNeedsLiveWeb({ query, capability: "general" })).toBe(true);
  });

  it("Case 5: failed retrieval with user content does not emit generic failure", () => {
    const evidence = buildNewsEvidencePackage({
      query: MTN_HEROES_OF_CHANGE_FIXTURE,
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

    const enforced = enforceNewsEvidenceIntegrity({
      answer: insufficientEvidenceFallback(MTN_HEROES_OF_CHANGE_FIXTURE),
      query: MTN_HEROES_OF_CHANGE_FIXTURE,
      evidence,
      isNewsQuery: true,
    });

    expect(enforced.content).not.toContain("couldn't retrieve enough current evidence");
    expect(enforced.content).toMatch(/19 October 2026/i);
    expect(enforced.content).toMatch(/GHS400,000/i);
    expect(enforced.content).toMatch(/user-provided|you provided|message you shared/i);
    expect(enforced.flags).toContain("news_user_context_recovery");
  });

  it("Case 6: current news with no supplied content still requires retrieval", () => {
    const query = "What are the latest Ghana headlines today?";
    expect(classifyInformationRequest(query)).toBe("retrieve_current_news");
    expect(queryNeedsLiveWeb({ query, capability: "ghana_news" })).toBe(true);
    expect(shouldAutoEnableLiveWeb(query)).toBe(true);

    const evidence = buildNewsEvidencePackage({
      query,
      capability: "ghana_news",
      sources: [],
      pagesReadUrls: [],
      warnings: ["Search failed"],
      liveSearchUsed: false,
      retrievalFailed: true,
    });

    const enforced = enforceNewsEvidenceIntegrity({
      answer: "**Verified** — Fake headline.",
      query,
      evidence,
      isNewsQuery: true,
    });

    expect(enforced.content).toContain("Evidence is insufficient");
    expect(enforced.flags).toContain("news_insufficient_evidence");
  });

  it("Case 7: successful search retains external evidence path", () => {
    const query = "Latest Ghana headlines today";
    const evidence = buildNewsEvidencePackage({
      query,
      capability: "ghana_news",
      sources: [
        {
          title: "Parliament update",
          uri: "https://www.myjoyonline.com/example/",
          domain: "myjoyonline.com",
          excerpt: "Parliament convenes on budget matters.",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: ["https://www.myjoyonline.com/example/"],
      warnings: [],
      liveSearchUsed: true,
    });

    const enforced = enforceNewsEvidenceIntegrity({
      answer: "**Reported** — Parliament convenes on budget matters. [MyJoyOnline](https://www.myjoyonline.com/example/)",
      query,
      evidence,
      isNewsQuery: true,
    });

    expect(enforced.content).not.toContain("couldn't retrieve enough current evidence");
    expect(enforced.content).toMatch(/Parliament convenes/i);
  });

  it("Case 8: poor unrelated search results are not treated as verification of user paste", () => {
    const query = MTN_HEROES_OF_CHANGE_FIXTURE;
    const evidence = buildNewsEvidencePackage({
      query,
      capability: "live_web",
      sources: [
        {
          title: "Random sports headline unrelated to MTN",
          uri: "https://example.com/sports/",
          domain: "example.com",
          excerpt: "Unrelated football match recap.",
          accessedAt: Date.now(),
        },
      ],
      pagesReadUrls: [],
      warnings: [],
      liveSearchUsed: true,
      retrievalFailed: false,
    });

    const block = buildEvidenceContextBlock(evidence);
    expect(block).toContain("User-provided content mode");
    expect(block).toMatch(/must not override or falsify user-provided details/i);

    const recovery = buildUserContextRecoveryAnswer(query);
    expect(recovery).toMatch(/19 October 2026/i);
    expect(recovery).not.toMatch(/Verified/i);
  });
});

describe("validateAnswerQuality integration", () => {
  it("recovers from generic retrieval failure when user supplied MTN announcement", () => {
    const evidence = buildNewsEvidencePackage({
      query: MTN_HEROES_OF_CHANGE_FIXTURE,
      capability: "live_web",
      sources: [],
      pagesReadUrls: [],
      warnings: ["Search failed"],
      liveSearchUsed: false,
      retrievalFailed: true,
    });

    const context = prepareAnswerQualityContext({
      mode: "chat",
      query: MTN_HEROES_OF_CHANGE_FIXTURE,
    });

    const validated = validateAnswerQuality({
      answer: insufficientEvidenceFallback(MTN_HEROES_OF_CHANGE_FIXTURE),
      context,
      newsEvidence: evidence,
    });

    expect(validated.content).not.toContain("couldn't retrieve enough current evidence");
    expect(validated.content).toMatch(/19 October 2026/i);
    expect(validated.report.flags).toContain("news_user_context_recovery");
  });
});
