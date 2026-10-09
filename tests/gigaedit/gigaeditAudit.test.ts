import { describe, expect, it } from "vitest";
import { AFRICAN_VOICES, filterVoicesByTab } from "../../web/lib/gigaedit/africanVoices";
import { formatTimelineClipLabel } from "../../web/lib/gigaedit/timelineLanes";
import type { GigaEditTimelineClip } from "../../web/lib/gigaedit/types";

describe("gigaedit audit — African voices", () => {
  it("seeds 10 African voices including Twi, Hausa, Yoruba, Swahili", () => {
    expect(AFRICAN_VOICES.length).toBeGreaterThanOrEqual(10);
    const accents = new Set(AFRICAN_VOICES.map((v) => v.accent));
    expect(accents.has("twi")).toBe(true);
    expect(accents.has("hausa")).toBe(true);
    expect(accents.has("yoruba")).toBe(true);
    expect(accents.has("swahili")).toBe(true);
  });

  it("filters African tab to catalog voices", () => {
    expect(filterVoicesByTab("african").length).toBe(AFRICAN_VOICES.length);
  });
});

describe("gigaedit audit — timeline labels", () => {
  it("replaces numeric duplicate ids with friendly overlay labels", () => {
    const clip: GigaEditTimelineClip = {
      id: "clip_1",
      track: "video",
      label: "1001153242",
      startSec: 0,
      endSec: 5,
      speed: 1,
      rotateDeg: 0,
      filterId: "none",
      videoLayer: 1,
      clipRole: "overlay",
      timelineLane: "b-roll",
    };
    expect(formatTimelineClipLabel(clip)).toBe("Overlay 1");
  });
});
