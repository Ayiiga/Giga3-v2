import { describe, expect, it } from "vitest";
import {
  clipsForLane,
  formatRulerTime,
  inferClipLane,
  syntheticCaptionsBar,
  syntheticLogoBar,
  TIMELINE_LANES,
  timelineRulerTicks,
} from "../../web/lib/gigaedit/timelineLanes";
import type { GigaEditTimelineClip } from "../../web/lib/gigaedit/types";

function videoClip(partial: Partial<GigaEditTimelineClip>): GigaEditTimelineClip {
  return {
    id: partial.id ?? "c1",
    track: "video",
    label: partial.label ?? "Clip",
    startSec: partial.startSec ?? 0,
    endSec: partial.endSec ?? 5,
    speed: 1,
    rotateDeg: 0,
    filterId: "none",
    videoLayer: partial.videoLayer ?? 0,
    clipRole: partial.videoLayer ? "overlay" : "main",
    ...partial,
  };
}

describe("timelineLanes", () => {
  it("defines seven semantic lanes in spec order", () => {
    expect(TIMELINE_LANES.map((l) => l.id)).toEqual([
      "main-video",
      "b-roll",
      "cutout-person",
      "screen-recording",
      "logo",
      "text",
      "captions",
    ]);
  });

  it("infers lanes from clip metadata", () => {
    expect(inferClipLane(videoClip({ videoLayer: 0 }))).toBe("main-video");
    expect(inferClipLane(videoClip({ videoLayer: 1 }))).toBe("b-roll");
    expect(
      inferClipLane(videoClip({ videoLayer: 2, cameraId: "screen", clipRole: "overlay" }))
    ).toBe("screen-recording");
    expect(
      inferClipLane(videoClip({ videoLayer: 2, maskShape: "circle", clipRole: "overlay" }))
    ).toBe("cutout-person");
    expect(
      inferClipLane(
        videoClip({ track: "text", startSec: 1, endSec: 4, timelineLane: undefined })
      )
    ).toBe("text");
  });

  it("groups clips by lane", () => {
    const clips = [
      videoClip({ id: "main", startSec: 0, endSec: 15 }),
      videoClip({ id: "b1", videoLayer: 1, startSec: 2, endSec: 7, clipRole: "overlay" }),
      videoClip({ id: "b2", videoLayer: 2, startSec: 10, endSec: 14, clipRole: "overlay" }),
    ];
    expect(clipsForLane(clips, "main-video")).toHaveLength(1);
    expect(clipsForLane(clips, "b-roll")).toHaveLength(2);
  });

  it("formats ruler time as MM:SS", () => {
    expect(formatRulerTime(0)).toBe("00:00");
    expect(formatRulerTime(15)).toBe("00:15");
  });

  it("builds ruler ticks for short timelines", () => {
    const ticks = timelineRulerTicks(15, 4);
    expect(ticks[0]).toBe(0);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
  });

  it("creates synthetic brand and caption bars", () => {
    expect(syntheticLogoBar(15, true, "Giga3 AI")?.label).toBe("Giga3 AI");
    expect(syntheticCaptionsBar(15, true)?.lane).toBe("captions");
    expect(syntheticLogoBar(15, false)).toBeNull();
  });
});
