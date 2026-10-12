import { describe, expect, it } from "vitest";
import {
  clipAtTimelineSec,
  resolvePlayheadTrimTarget,
} from "../../web/lib/gigaedit/timelineJoin";
import { applyPlayheadTrim } from "../../web/lib/gigaedit/trimClip";
import type { GigaEditTimelineClip } from "../../web/lib/gigaedit/types";

function videoClip(
  partial: Partial<GigaEditTimelineClip> &
    Pick<GigaEditTimelineClip, "id" | "startSec" | "endSec" | "label">
): GigaEditTimelineClip {
  return {
    track: "video",
    speed: 1,
    rotateDeg: 0,
    filterId: "none",
    sourceKey: partial.sourceKey ?? partial.id,
    sourceStartSec: partial.sourceStartSec ?? 0,
    sourceEndSec: partial.sourceEndSec ?? partial.endSec - partial.startSec,
    videoLayer: 0,
    ...partial,
  };
}

/** Simulate VideoEditor confirmPlayheadTrim mapping without UI. */
function applyTrimIfTarget(
  clips: GigaEditTimelineClip[],
  playhead: number,
  side: "after" | "before",
  selectedClipId?: string | null
): GigaEditTimelineClip[] {
  const active = resolvePlayheadTrimTarget(clips, playhead, selectedClipId);
  if (!active) return clips.map((c) => ({ ...c }));
  return clips.map((clip) =>
    clip.id === active.id ? applyPlayheadTrim(clip, playhead, side) : clip
  );
}

describe("resolvePlayheadTrimTarget (D1)", () => {
  const clipA = videoClip({
    id: "a",
    label: "A",
    startSec: 0,
    endSec: 4,
    sourceEndSec: 4,
  });
  const clipB = videoClip({
    id: "b",
    label: "B",
    startSec: 5,
    endSec: 10,
    sourceKey: "b",
    sourceEndSec: 5,
  });
  /** Gap 4–5 between A and B */
  const twoClips = [clipA, clipB];

  it("playhead inside a valid clip targets that clip (not the first)", () => {
    expect(resolvePlayheadTrimTarget(twoClips, 7, null)?.id).toBe("b");
    expect(clipAtTimelineSec(twoClips, 7)?.id).toBe("b");

    const next = applyTrimIfTarget(twoClips, 7, "after", null);
    expect(next.find((c) => c.id === "a")).toMatchObject({
      sourceStartSec: 0,
      sourceEndSec: 4,
      startSec: 0,
      endSec: 4,
    });
    const b = next.find((c) => c.id === "b")!;
    expect(b.sourceStartSec).toBeCloseTo(2, 3); // timeline 7 → source offset 2 on B
    expect(b.id).toBe("b");
  });

  it("playhead in a timeline gap does not trim the first or any other clip", () => {
    expect(resolvePlayheadTrimTarget(twoClips, 4.5, null)).toBeNull();
    expect(resolvePlayheadTrimTarget(twoClips, 4.5, "a")).toBeNull();
    expect(resolvePlayheadTrimTarget(twoClips, 4.5, "b")).toBeNull();

    const before = structuredClone(twoClips);
    const next = applyTrimIfTarget(twoClips, 4.5, "after", "a");
    expect(next).toEqual(before);
  });

  it("playhead beyond the final clip does not trim any clip", () => {
    expect(resolvePlayheadTrimTarget(twoClips, 10, null)).toBeNull();
    expect(resolvePlayheadTrimTarget(twoClips, 12, "b")).toBeNull();

    const before = structuredClone(twoClips);
    const next = applyTrimIfTarget(twoClips, 12, "before", "b");
    expect(next).toEqual(before);
  });

  it("missing or stale selected clip ID does not redirect trim to another clip", () => {
    expect(resolvePlayheadTrimTarget(twoClips, 4.5, "deleted-id")).toBeNull();
    expect(resolvePlayheadTrimTarget(twoClips, 12, "ghost")).toBeNull();

    // Selection of A while playhead is on B still prefers playhead hit (B)
    expect(resolvePlayheadTrimTarget(twoClips, 7, "a")?.id).toBe("b");

    const before = structuredClone(twoClips);
    const rejected = applyTrimIfTarget(twoClips, 4.5, "after", "deleted-id");
    expect(rejected).toEqual(before);
  });

  it("rejected trim leaves other clips and source bounds unchanged", () => {
    const before = structuredClone(twoClips);
    const next = applyTrimIfTarget(twoClips, 4.5, "before", null);
    expect(next[0]).toEqual(before[0]);
    expect(next[1]).toEqual(before[1]);
    expect(next[0].sourceStartSec).toBe(0);
    expect(next[0].sourceEndSec).toBe(4);
    expect(next[1].sourceStartSec).toBe(0);
    expect(next[1].sourceEndSec).toBe(5);
  });

  it("never silently falls back to sortedVideoClips[0] when playhead misses", () => {
    // Historical bug: gap → first clip. Now null.
    expect(resolvePlayheadTrimTarget(twoClips, 4.5, null)).toBeNull();
    expect(resolvePlayheadTrimTarget([], 0, null)).toBeNull();
  });
});
