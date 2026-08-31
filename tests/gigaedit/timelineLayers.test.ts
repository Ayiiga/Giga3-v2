import { describe, expect, it } from "vitest";
import {
  buildOverlayClip,
  duplicateClipAsOverlay,
  mainClipAtTimelineSec,
  overlaysAtTimelineSec,
  projectTimelineDuration,
  snapTimelineSec,
  sortedMainVideoClips,
  sortedOverlayClips,
} from "../../web/lib/gigaedit/timelineLayers";
import { pushUndoState, undoState, createUndoStack } from "../../web/lib/gigaedit/undoStack";
import { formatTimecodeMs, roundToFrame } from "../../web/lib/gigaedit/frameTime";
import type { GigaEditTimelineClip } from "../../web/lib/gigaedit/types";

function mainClip(partial: Partial<GigaEditTimelineClip> & Pick<GigaEditTimelineClip, "startSec" | "endSec">): GigaEditTimelineClip {
  return {
    id: partial.id ?? "m1",
    track: "video",
    label: partial.label ?? "Main",
    speed: 1,
    rotateDeg: 0,
    filterId: "none",
    videoLayer: 0,
    clipRole: "main",
    sourceKey: "primary",
    sourceStartSec: 0,
    sourceEndSec: partial.endSec - partial.startSec,
    ...partial,
  };
}

describe("timelineLayers", () => {
  it("separates main and overlay clips", () => {
    const clips = [
      mainClip({ startSec: 0, endSec: 10 }),
      buildOverlayClip({
        sourceKey: "ov",
        label: "B-roll",
        durationSec: 4,
        playheadSec: 2,
        videoLayer: 1,
      }),
    ];
    expect(sortedMainVideoClips(clips)).toHaveLength(1);
    expect(sortedOverlayClips(clips)).toHaveLength(1);
    expect(projectTimelineDuration(clips)).toBe(10);
  });

  it("places overlay at playhead and finds active overlays", () => {
    const overlay = buildOverlayClip({
      sourceKey: "ov",
      label: "Overlay",
      durationSec: 3,
      playheadSec: 5,
      videoLayer: 1,
    });
    const clips = [mainClip({ startSec: 0, endSec: 12 }), overlay];
    expect(overlaysAtTimelineSec(clips, 6)).toHaveLength(1);
    expect(mainClipAtTimelineSec(clips, 6)?.clipRole).toBe("main");
  });

  it("snaps to playhead when enabled", () => {
    const clips = [mainClip({ startSec: 0, endSec: 8 })];
    expect(snapTimelineSec(5.02, clips, 5, true)).toBe(5);
  });

  it("duplicates clip as overlay on new layer", () => {
    const base = mainClip({ id: "a", startSec: 0, endSec: 6, label: "A" });
    const dup = duplicateClipAsOverlay(base, [base], 3);
    expect(dup.videoLayer).toBeGreaterThan(0);
    expect(dup.startSec).toBe(3);
  });
});

describe("undoStack", () => {
  it("undoes clip mutations", () => {
    const stack = createUndoStack<string[]>(["a"]);
    const next = pushUndoState(stack, ["a", "b"]);
    const undone = undoState(next);
    expect(undone.present).toEqual(["a"]);
  });
});

describe("frameTime", () => {
  it("formats millisecond timecode", () => {
    expect(formatTimecodeMs(12.483)).toBe("00:12.483");
    expect(roundToFrame(1.001)).toBeCloseTo(1, 2);
  });
});
