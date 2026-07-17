import { describe, expect, it } from "vitest";
import { buildGigaSocialFeedUrl, buildGigaSocialProfileUrl } from "@/lib/gigasocial/shareLinks";
import { parseProfileHandle } from "@/lib/gigasocial/profileRoute";

describe("gigasocial profile navigation", () => {
  it("builds static-export-safe profile URLs with handle query", () => {
    expect(buildGigaSocialProfileUrl("CreatorOne")).toBe(
      "https://www.giga3ai.com/gigasocial/profile/?handle=creatorone"
    );
    expect(buildGigaSocialProfileUrl("@CreatorOne")).toContain("handle=creatorone");
  });

  it("parses handle from query and path segments", () => {
    expect(parseProfileHandle("/gigasocial/profile/", "handle=creatorone")).toBe("creatorone");
    expect(parseProfileHandle("/gigasocial/profile/creatorone", "")).toBe("creatorone");
    expect(parseProfileHandle("/gigasocial/profile/", "handle=%40creatorone")).toBe("creatorone");
  });

  it("builds feed deep links with stories and ring params", () => {
    expect(buildGigaSocialFeedUrl({ stories: true })).toBe(
      "https://www.giga3ai.com/gigasocial/?stories=1"
    );
    const withRing = buildGigaSocialFeedUrl({ stories: true, ring: "community" });
    expect(withRing).toContain("stories=1");
    expect(withRing).toContain("ring=community");
  });
});
