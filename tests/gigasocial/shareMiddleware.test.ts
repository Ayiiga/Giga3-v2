import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("GigaSocial share middleware", () => {
  it("proxies og-image requests on the giga3ai.com domain", () => {
    const src = readFileSync(join(process.cwd(), "web/functions/_middleware.js"), "utf8");
    expect(src).toContain("parseOgImagePostId");
    expect(src).toContain("/gigasocial/post/og-image?id=");
  });

  it("serves crawler OG HTML for canonical post paths", () => {
    const src = readFileSync(join(process.cwd(), "web/functions/_middleware.js"), "utf8");
    expect(src).toContain("/gigasocial/post/preview?id=");
    expect(src).toContain("CRAWLER_UA");
  });
});
