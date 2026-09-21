import { describe, expect, it } from "vitest";
import {
  classifyInformationRequest,
  detectAnswerFromUserContextIntent,
  detectNewsRetrievalIntent,
  hasSubstantiveUserProvidedContent,
  queryNeedsLiveWeb,
  resolveResearchCapability,
  shouldAutoEnableLiveWeb,
} from "../../convex/researchCapabilities";
import { classifyNewsQuery } from "../../convex/newsEvidence/queryClassification";

export const MTN_FULL_ANNOUNCEMENT =
  "Dear Valued Customer, Nominations for Heroes of Change Season 8 will close on 19 October 2026. Do you know someone doing extraordinary work in your community in Education, Health and Economic Empowerment? Nominate your hero now! The overall winner will receive GHS400,000, and each category winner will receive GHS200,000. Nominators of the 10 finalists will also be rewarded, including outstanding contributions in Sustainability and Digital Innovation. Hurry, nominate your hero today! Visit MTN Ghana's website - www.mtn.com.gh and nominate or drop off the nomination at any MTN Service Center.";

describe("MTN routing audit snapshot", () => {
  it("records classification on current branch", () => {
    const capability = resolveResearchCapability({
      query: MTN_FULL_ANNOUNCEMENT,
      liveWebEnabled: true,
    });
    expect({
      infoMode: classifyInformationRequest(MTN_FULL_ANNOUNCEMENT),
      userContextIntent: detectAnswerFromUserContextIntent(MTN_FULL_ANNOUNCEMENT),
      substantiveUserContent: hasSubstantiveUserProvidedContent(MTN_FULL_ANNOUNCEMENT),
      detectNewsRetrievalIntent: detectNewsRetrievalIntent(MTN_FULL_ANNOUNCEMENT),
      shouldAutoEnableLiveWeb: shouldAutoEnableLiveWeb(MTN_FULL_ANNOUNCEMENT),
      requiresRetrieval: classifyNewsQuery(MTN_FULL_ANNOUNCEMENT).requiresRetrieval,
      capability,
      queryNeedsLiveWeb: queryNeedsLiveWeb({
        query: MTN_FULL_ANNOUNCEMENT,
        capability,
      }),
    }).toMatchSnapshot();
  });
});
