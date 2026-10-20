import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalizeInternalGiga3Href } from "../../web/lib/chat/productRedirects";

const ROOT = resolve(__dirname, "../..");

describe("legacy /learn and /account destinations", () => {
  it("redirects Cloudflare Pages aliases to live Settings and GigaLearn", () => {
    const redirects = readFileSync(resolve(ROOT, "web/public/_redirects"), "utf8");
    expect(redirects).toMatch(/\/learn\s+\/gigalearn\/\s+301/);
    expect(redirects).toMatch(/\/learn\/\s+\/gigalearn\/\s+301/);
    expect(redirects).toMatch(/\/account\s+\/settings\/\s+301/);
    expect(redirects).toMatch(/\/account\/\s+\/settings\/\s+301/);
    expect(redirects).toMatch(/\/account\/settings\/?\s+\/settings\/\s+301/);
  });

  it("rewrites chat markdown legacy hrefs to live paths", () => {
    expect(canonicalizeInternalGiga3Href("/learn/")).toBe("/gigalearn/");
    expect(canonicalizeInternalGiga3Href("/learn")).toBe("/gigalearn/");
    expect(canonicalizeInternalGiga3Href("/account")).toBe("/settings/");
    expect(canonicalizeInternalGiga3Href("/account/settings/")).toBe("/settings/");
    expect(canonicalizeInternalGiga3Href("https://www.giga3ai.com/learn")).toBe(
      "https://www.giga3ai.com/gigalearn/"
    );
    expect(canonicalizeInternalGiga3Href("https://www.giga3ai.com/account/")).toBe(
      "https://www.giga3ai.com/settings/"
    );
    expect(canonicalizeInternalGiga3Href("/gigalearn/academy/")).toBe("/gigalearn/academy/");
    expect(canonicalizeInternalGiga3Href("https://example.com/learn")).toBe(
      "https://example.com/learn"
    );
  });
});
