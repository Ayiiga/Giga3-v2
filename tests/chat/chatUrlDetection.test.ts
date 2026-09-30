import { describe, expect, it } from "vitest";
import {
  detectPrimaryLink,
  extractUrlsFromText,
  LINK_ACTIONS,
} from "../../web/lib/chat/urlDetection";
import {
  queryContainsPublicUrl,
  queryNeedsLiveWeb,
} from "../../convex/researchCapabilities";

describe("chat URL detection", () => {
  it("extracts public https URLs from composer text", () => {
    const urls = extractUrlsFromText(
      "Please read https://example.com/article and summarize it."
    );
    expect(urls).toEqual(["https://example.com/article"]);
  });

  it("detects a primary link with domain title", () => {
    const link = detectPrimaryLink("Check https://www.bbc.com/news/world-africa-123");
    expect(link).not.toBeNull();
    expect(link!.domain).toBe("bbc.com");
    expect(link!.title).toBe("Bbc");
  });

  it("builds link action prompts with the URL embedded", () => {
    const summarize = LINK_ACTIONS.find((a) => a.id === "summarize")!;
    expect(summarize.prompt("https://example.com/page")).toContain(
      "https://example.com/page"
    );
  });

  it("triggers live web when a public URL is pasted", () => {
    expect(queryContainsPublicUrl("Summarize https://example.com/report")).toBe(true);
    expect(
      queryNeedsLiveWeb({
        query: "Summarize https://example.com/report",
        capability: "general",
      })
    ).toBe(true);
  });

  it("still skips live web for plain greetings without URLs", () => {
    expect(queryNeedsLiveWeb({ query: "Hello", capability: "general" })).toBe(false);
  });
});
