import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { onRequest } from "../../web/functions/_middleware.js";

describe("GigaSocial share middleware", () => {
  it("proxies og-image requests on the giga3ai.com domain", () => {
    const src = readFileSync(join(process.cwd(), "web/functions/_middleware.js"), "utf8");
    expect(src).toContain("parseOgImagePostId");
    expect(src).toContain("/gigasocial/post/og-image?id=");
  });

  it("serves the full post to search crawlers and a share card to social preview agents", async () => {
    const fetchPreview = vi.fn(async () => new Response("share preview"));
    vi.stubGlobal("fetch", fetchPreview);
    try {
      const url = "https://www.giga3ai.com/gigasocial/post/sample/";
      for (const [userAgent, expected] of [
        ["Googlebot", "public page"],
        ["bingbot", "public page"],
        ["Twitterbot", "share preview"],
        ["facebookexternalhit", "share preview"],
      ]) {
        const response = await onRequest({
          request: new Request(url, { headers: { "User-Agent": userAgent } }),
          next: () => new Response("public page"),
        });
        expect(await response.text()).toBe(expected);
      }
      expect(fetchPreview).toHaveBeenCalledTimes(2);
      expect(fetchPreview).toHaveBeenCalledWith(
        expect.stringContaining("/gigasocial/post/preview?id=sample"),
        expect.anything()
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
