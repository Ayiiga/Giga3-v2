import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("feed media cache helpers", () => {
  it("reuses stories IDB cache and prefetches feed rows", () => {
    const source = readFileSync(
      resolve(__dirname, "../../web/lib/gigasocial/feedMediaCache.ts"),
      "utf8"
    );
    expect(source).toContain("cacheViewedStoryMedia");
    expect(source).toContain("FEED_PREFETCH_COUNT");
    expect(source).toContain("giga3-feed-media-http-v1");
  });

  it("wires offline playback + prefetch into the feed panel", () => {
    const panel = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialFeedPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("prefetchFeedMedia");
    expect(panel).toContain("offlinePlayback={!effectiveOnline}");
  });

  it("attaches remix source media in the composer", () => {
    const composer = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialComposer.tsx"),
      "utf8"
    );
    expect(composer).toContain("attachRemixSourceMedia");
    expect(composer).toContain("Original media attached");
  });
});
