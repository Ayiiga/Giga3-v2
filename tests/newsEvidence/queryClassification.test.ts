import { describe, expect, it } from "vitest";
import {
  classifyNewsQuery,
  requiresNewsRetrieval,
} from "../../convex/newsEvidence/queryClassification";

describe("news query classification", () => {
  it("requires retrieval for today/latest Ghana news", () => {
    expect(requiresNewsRetrieval("What are the latest Ghana headlines today?")).toBe(true);
    const classified = classifyNewsQuery("Breaking news in Accra now");
    expect(classified.country).toBe("Ghana");
    expect(classified.city).toBe("Accra");
    expect(classified.requestedTime).toBe("breaking");
    expect(classified.requiresRetrieval).toBe(true);
  });

  it("detects comparison and verification intents", () => {
    const compare = classifyNewsQuery("Compare reports on the port congestion story");
    expect(compare.comparisonRequested).toBe(true);
    const verify = classifyNewsQuery("Fact-check this claim about Ghana elections");
    expect(verify.verificationRequested).toBe(true);
  });
});
