import { describe, expect, it } from "vitest";
import {
  applyPlayheadTrim,
  clipSourceBounds,
  previewPlayheadTrim,
} from "../../web/lib/gigaedit/trimClip";
import type { GigaEditTimelineClip } from "../../web/lib/gigaedit/types";

function makeClip(partial: Partial<GigaEditTimelineClip> = {}): GigaEditTimelineClip {
  return {
    id: "c1",
    track: "video",
    label: "Clip",
    startSec: 0,
    endSec: 10,
    speed: 1,
    rotateDeg: 0,
    filterId: "none",
    sourceStartSec: 0,
    sourceEndSec: 10,
    videoLayer: 0,
    ...partial,
  };
}

describe("trimClip playhead semantics", () => {
  it("defaults source bounds when sourceStart/End omitted (legacy clips)", () => {
    const clip = makeClip({ sourceStartSec: undefined, sourceEndSec: undefined, endSec: 8 });
    expect(clipSourceBounds(clip)).toEqual({ sourceStart: 0, sourceEnd: 8 });
  });

  it("keep after playhead discards footage before playhead exactly", () => {
    const clip = makeClip();
    const preview = previewPlayheadTrim(clip, 4, "after");
    expect(preview.viable).toBe(true);
    expect(preview.sourceStartSec).toBeCloseTo(4, 3);
    expect(preview.sourceEndSec).toBeCloseTo(10, 3);
    expect(preview.remainingLabel).toBe("0:04–0:10");

    const next = applyPlayheadTrim(clip, 4, "after");
    expect(next.sourceStartSec).toBeCloseTo(4, 3);
    expect(next.sourceEndSec).toBeCloseTo(10, 3);
    expect(next.endSec - next.startSec).toBeCloseTo(6, 3);
    expect(next.label).toContain("keep after");
  });

  it("keep before playhead discards footage after playhead exactly", () => {
    const clip = makeClip();
    const preview = previewPlayheadTrim(clip, 4, "before");
    expect(preview.viable).toBe(true);
    expect(preview.sourceStartSec).toBeCloseTo(0, 3);
    expect(preview.sourceEndSec).toBeCloseTo(4, 3);

    const next = applyPlayheadTrim(clip, 4, "before");
    expect(next.sourceEndSec).toBeCloseTo(4, 3);
    expect(next.endSec - next.startSec).toBeCloseTo(4, 3);
  });

  it("does not apply the old 35% keep heuristic", () => {
    const clip = makeClip({ endSec: 20, sourceEndSec: 20 });
    const next = applyPlayheadTrim(clip, 2, "after");
    // Remaining should be 18s of source, not ~35% of remaining (~6.3s).
    expect(next.sourceEndSec! - next.sourceStartSec!).toBeCloseTo(18, 2);
  });

  it("marks keep-after non-viable near the end of the clip", () => {
    const clip = makeClip();
    const preview = previewPlayheadTrim(clip, 9.9, "after");
    expect(preview.viable).toBe(false);
    expect(applyPlayheadTrim(clip, 9.9, "after")).toEqual(clip);
  });

  it("respects speed when computing timeline duration after trim", () => {
    const clip = makeClip({ speed: 2, endSec: 5, sourceEndSec: 10 });
    const next = applyPlayheadTrim(clip, 2.5, "after");
    // Timeline playhead 2.5 → source 5; keep source 5–10 at 2x → 2.5s timeline.
    expect(next.sourceStartSec).toBeCloseTo(5, 2);
    expect(next.endSec - next.startSec).toBeCloseTo(2.5, 2);
  });
});
