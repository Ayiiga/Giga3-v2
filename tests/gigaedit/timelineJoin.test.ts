import { describe, expect, it } from "vitest";
import {
  buildSequentialVideoClips,
  clipAtTimelineSec,
  joinedTimelineDuration,
  remainingJoinSlots,
  sortedVideoClips,
  sourceSecToTimelineSec,
  timelineSecToSourceSec,
} from "../../web/lib/gigaedit/timelineJoin";
import { MAX_GIGAEDIT_JOIN_CLIPS, type GigaEditTimelineClip } from "../../web/lib/gigaedit/types";

function videoClip(
  partial: Partial<GigaEditTimelineClip> & Pick<GigaEditTimelineClip, "startSec" | "endSec" | "label">
): GigaEditTimelineClip {
  return {
    id: partial.id ?? `clip_${partial.startSec}`,
    track: "video",
    speed: 1,
    rotateDeg: 0,
    filterId: "none",
    sourceKey: partial.sourceKey ?? "primary",
    sourceStartSec: partial.sourceStartSec ?? 0,
    sourceEndSec: partial.sourceEndSec ?? partial.endSec - partial.startSec,
    ...partial,
  };
}

describe("GigaEdit timeline join helpers", () => {
  it("builds sequential clips up to the join limit", () => {
    const next = buildSequentialVideoClips([], [
      { sourceKey: "a", label: "A", durationSec: 5 },
      { sourceKey: "b", label: "B", durationSec: 7 },
    ]);
    const videoClips = sortedVideoClips(next);
    expect(videoClips).toHaveLength(2);
    expect(videoClips[0]).toMatchObject({ startSec: 0, endSec: 5, sourceKey: "a" });
    expect(videoClips[1]).toMatchObject({ startSec: 5, endSec: 12, sourceKey: "b" });
    expect(joinedTimelineDuration(next)).toBe(12);
  });

  it("finds the active clip for a timeline position", () => {
    const clips = [
      videoClip({ label: "A", startSec: 0, endSec: 4, sourceEndSec: 4 }),
      videoClip({ label: "B", startSec: 4, endSec: 10, sourceKey: "b", sourceEndSec: 6 }),
    ];
    expect(clipAtTimelineSec(clips, 2)?.label).toBe("A");
    expect(clipAtTimelineSec(clips, 6)?.label).toBe("B");
  });

  it("maps timeline and source seconds within a clip", () => {
    const clip = videoClip({
      label: "A",
      startSec: 10,
      endSec: 20,
      sourceStartSec: 2,
      sourceEndSec: 12,
      speed: 1,
    });
    expect(timelineSecToSourceSec(clip, 15)).toBe(7);
    expect(sourceSecToTimelineSec(clip, 7)).toBe(15);
  });

  it("tracks remaining join slots against the 10-video cap", () => {
    const clips = Array.from({ length: 7 }, (_, index) =>
      videoClip({ label: `C${index}`, startSec: index, endSec: index + 1 })
    );
    expect(remainingJoinSlots(clips)).toBe(MAX_GIGAEDIT_JOIN_CLIPS - 7);
  });
});
