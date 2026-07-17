import { describe, expect, it } from "vitest";
import {
  buildGigaSocialDeveloperApiUrl,
  getGigaSocialDeveloperApiBaseUrl,
} from "@/lib/gigasocial/developerApi";

describe("gigasocial developer api urls", () => {
  it("builds the developer API base URL", () => {
    expect(getGigaSocialDeveloperApiBaseUrl()).toMatch(
      /\/gigasocial\/api\/v1$/
    );
  });

  it("builds endpoint URLs with query params", () => {
    const url = buildGigaSocialDeveloperApiUrl("feed", { limit: 10, cursor: 123 });
    expect(url).toContain("/gigasocial/api/v1/feed");
    expect(url).toContain("limit=10");
    expect(url).toContain("cursor=123");
  });

  it("builds profile endpoint with handle", () => {
    const url = buildGigaSocialDeveloperApiUrl("profile", { handle: "creatorone" });
    expect(url).toContain("handle=creatorone");
  });
});
