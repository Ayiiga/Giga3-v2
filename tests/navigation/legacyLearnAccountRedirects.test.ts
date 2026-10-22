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

  it("redirects Exam Practice short aliases to /gigalearn/exam/", () => {
    const redirects = readFileSync(resolve(ROOT, "web/public/_redirects"), "utf8");
    for (const from of [
      "/exam",
      "/exam/",
      "/practice",
      "/practice/",
      "/exam-practice",
      "/exam-practice/",
      "/gigalearn/exam-practice",
      "/gigalearn/exam-practice/",
      "/teacher-promotion",
      "/teacher-promotion/",
      "/bece",
      "/bece/",
    ]) {
      expect(redirects).toMatch(
        new RegExp(`${from.replace(/\//g, "\\/")}\\s+/gigalearn/exam/\\s+301`)
      );
    }
    expect(redirects).toMatch(/\/gigalearn\/exam\/free\/?\s+\/gigalearn\/exam\/practice\/\s+301/);
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
    expect(canonicalizeInternalGiga3Href("/exam")).toBe("/gigalearn/exam/");
    expect(canonicalizeInternalGiga3Href("/practice/")).toBe("/gigalearn/exam/");
    expect(canonicalizeInternalGiga3Href("/gigalearn/exam-practice")).toBe("/gigalearn/exam/");
    expect(canonicalizeInternalGiga3Href("https://www.giga3ai.com/teacher-promotion")).toBe(
      "https://www.giga3ai.com/gigalearn/exam/promotion/"
    );
  });
});
