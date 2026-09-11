import { describe, expect, it } from "vitest";
import {
  GHANA_NEWS_SOURCE_HINTS,
  lookupSourceByDomain,
  tierForDomain,
} from "../../convex/newsEvidence/sourceRegistry";

describe("news source registry", () => {
  it("maps known Ghana publishers to tiers", () => {
    expect(tierForDomain("myjoyonline.com")).toBe(2);
    expect(tierForDomain("bog.gov.gh")).toBe(1);
    expect(lookupSourceByDomain("graphic.com.gh")?.publisher).toBe("Graphic Online");
  });

  it("exports search hint domains from registry", () => {
    expect(GHANA_NEWS_SOURCE_HINTS).toContain("myjoyonline.com");
    expect(GHANA_NEWS_SOURCE_HINTS).toContain("graphic.com.gh");
  });
});
