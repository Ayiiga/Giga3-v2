import { describe, expect, it } from "vitest";
import {
  classifyInformationRequest,
  detectVerifyUserContentIntent,
} from "../../convex/newsEvidence/userContextRouting";
import { queryNeedsLiveWeb, shouldAutoEnableLiveWeb } from "../../convex/researchCapabilities";

describe("verify routing debug", () => {
  it("short verification question without paste", () => {
    const q = "Is this announcement still current?";
    expect(detectVerifyUserContentIntent(q)).toBe(true);
    expect(classifyInformationRequest(q)).toBe("verify_user_content");
    expect(shouldAutoEnableLiveWeb(q)).toBe(true);
    expect(
      queryNeedsLiveWeb({ query: q, capability: "general" })
    ).toBe(true);
  });
});
