import { describe, expect, it } from "vitest";
import {
  buildEpisodePostBody,
  canOptionalEpisodeSplit,
  episodeSeriesBaseTitle,
  isVideoOverSizeLimit,
  planVideoEpisodes,
  shouldOfferEpisodeSplit,
  SOCIAL_EPISODE_SPLIT_COUNT,
  suggestEpisodeTitle,
} from "../../web/lib/gigasocial/videoEpisodeSplit";
import { SOCIAL_MAX_VIDEO_BYTES } from "../../web/lib/gigasocial/constants";

describe("videoEpisodeSplit", () => {
  it("detects oversized videos and offers split for long clips", () => {
    expect(isVideoOverSizeLimit(SOCIAL_MAX_VIDEO_BYTES + 1)).toBe(true);
    expect(isVideoOverSizeLimit(SOCIAL_MAX_VIDEO_BYTES)).toBe(false);
    expect(shouldOfferEpisodeSplit(SOCIAL_MAX_VIDEO_BYTES + 1, 349)).toBe(true);
    expect(shouldOfferEpisodeSplit(SOCIAL_MAX_VIDEO_BYTES + 1, 20)).toBe(false);
    expect(shouldOfferEpisodeSplit(SOCIAL_MAX_VIDEO_BYTES - 1, 349)).toBe(false);
    expect(canOptionalEpisodeSplit(349)).toBe(true);
    expect(canOptionalEpisodeSplit(40)).toBe(false);
  });

  it("names episodes from caption without hashtags", () => {
    const caption =
      "Did Christ Really Said, 'This is my Blood'? Explained #Christ #Really #Blood #GigaSocial";
    const base = episodeSeriesBaseTitle(caption);
    expect(base).toContain("Did Christ Really Said");
    expect(base).not.toMatch(/#/);
    expect(suggestEpisodeTitle(base, 0, 3)).toBe(`${base} — Ep 1/3`);
    expect(suggestEpisodeTitle(base, 2, 3)).toBe(`${base} — Ep 3/3`);
  });

  it("plans three equal episodes for a ~349s source", () => {
    const plan = planVideoEpisodes({
      durationSec: 349,
      sizeBytes: 180 * 1024 * 1024,
      caption: "Did Christ Really Said, 'This is my Blood'? Explained #Christ",
      fileName: "1001215017.mp4",
      episodeCount: SOCIAL_EPISODE_SPLIT_COUNT,
    });
    expect(plan.episodeCount).toBe(3);
    expect(plan.items).toHaveLength(3);
    expect(plan.items[0].range.startSec).toBe(0);
    expect(plan.items[2].range.endSec).toBe(349);
    const total = plan.items.reduce((sum, item) => sum + item.durationSec, 0);
    expect(total).toBeCloseTo(349, 5);
    for (const item of plan.items) {
      expect(item.suggestedTitle).toMatch(/Ep \d\/3$/);
      expect(item.durationSec).toBeGreaterThan(100);
      expect(item.durationSec).toBeLessThan(130);
    }
  });

  it("builds episode bodies with series marker and hashtags", () => {
    const body = buildEpisodePostBody(
      "Title — Ep 1/3",
      "Hello world #Christ #GigaSocial",
      0,
      3
    );
    expect(body).toContain("Title — Ep 1/3");
    expect(body).toContain("Episode 1 of 3");
    expect(body).toContain("#Christ");
    expect(body).toContain("#GigaSocial");
  });

  it("rejects sources that are too short to split", () => {
    expect(() =>
      planVideoEpisodes({
        durationSec: 20,
        sizeBytes: SOCIAL_MAX_VIDEO_BYTES + 1,
      })
    ).toThrow(/too short/i);
  });
});
