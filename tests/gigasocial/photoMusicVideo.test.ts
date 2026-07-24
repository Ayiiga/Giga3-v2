import { describe, expect, it } from "vitest";
import {
  computeSlideDurationSec,
  coverDrawRect,
  PHOTO_MUSIC_MIN_SLIDE_SEC,
} from "../../web/lib/gigasocial/photoMusicVideo";

describe("photoMusicVideo helpers", () => {
  it("computes slide duration from audio length and photo count", () => {
    expect(computeSlideDurationSec(1, 15)).toBe(15);
    expect(computeSlideDurationSec(3, 15)).toBe(5);
    expect(computeSlideDurationSec(10, 15)).toBe(PHOTO_MUSIC_MIN_SLIDE_SEC);
  });

  it("cover-fits landscape into portrait canvas", () => {
    const rect = coverDrawRect(1600, 900, 1080, 1350);
    expect(rect.sx).toBeGreaterThan(0);
    expect(rect.sy).toBe(0);
    expect(rect.sh).toBe(900);
  });

  it("cover-fits portrait into portrait canvas", () => {
    const rect = coverDrawRect(900, 1600, 1080, 1350);
    expect(rect.sx).toBe(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
    expect(rect.sw).toBe(900);
  });
});
