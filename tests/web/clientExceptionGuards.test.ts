import { describe, expect, it } from "vitest";
import { sanitizeUrlString } from "../../web/lib/sanitizeUrl";
import { normalizeConvexUrl } from "../../web/lib/convex/env";
import { parseMessageMedia } from "../../web/lib/chat/parseMessageMedia";
import { safeParseMarkdownDocument } from "../../web/lib/chat/messageMarkdownParser";

describe("sanitizeUrlString", () => {
  it("removes zero-width characters from Convex URLs", () => {
    const dirty = "https://perfect-lark-521.convex.cloud\u2060";
    expect(sanitizeUrlString(dirty)).toBe("https://perfect-lark-521.convex.cloud");
    expect(normalizeConvexUrl(dirty)).toBe("https://perfect-lark-521.convex.cloud");
  });

  it("returns undefined for empty input", () => {
    expect(sanitizeUrlString("   ")).toBeUndefined();
    expect(sanitizeUrlString(null)).toBeUndefined();
  });
});

describe("parseMessageMedia", () => {
  it("handles null and non-string content", () => {
    expect(parseMessageMedia(null).text).toBe("");
    expect(parseMessageMedia(undefined).text).toBe("");
    expect(parseMessageMedia(42).text).toBe("42");
  });
});

describe("safeParseMarkdownDocument", () => {
  it("falls back to paragraph instead of throwing on malformed list input", () => {
    const blocks = safeParseMarkdownDocument("not\n  - broken\nlist");
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0]?.type).toBe("paragraph");
  });
});
