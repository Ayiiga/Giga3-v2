import { describe, expect, it } from "vitest";
import {
  resolvePlayheadTrimTarget,
} from "../../web/lib/gigaedit/timelineJoin";
import { applyPlayheadTrim } from "../../web/lib/gigaedit/trimClip";
import {
  TRIM_NEEDS_CLIP_STATUS,
  trimPromptPanelState,
} from "../../web/lib/gigaedit/trimPromptPanel";
import type { GigaEditTimelineClip } from "../../web/lib/gigaedit/types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

describe("trim prompt panel M1 (Cancel always available)", () => {
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
  const twoClips = [clipA, clipB];

  it("opens trim mode for a valid on-clip playhead with confirm + Cancel", () => {
    const playhead = 7;
    const target = resolvePlayheadTrimTarget(twoClips, playhead, null);
    expect(target?.id).toBe("b");

    // openTrimPrompt succeeds → trimPromptOpen true
    const panel = trimPromptPanelState(true, Boolean(target));
    expect(panel).toEqual({
      open: true,
      showNeedsClipStatus: false,
      showConfirm: true,
      showCancel: true,
    });
  });

  it("gap after open shows status, keeps Cancel, and dismisses without mutating clips", () => {
    const onClip = resolvePlayheadTrimTarget(twoClips, 7, null);
    expect(onClip?.id).toBe("b");
    const openPanel = trimPromptPanelState(true, Boolean(onClip));
    expect(openPanel.showConfirm).toBe(true);
    expect(openPanel.showCancel).toBe(true);

    // Playhead moves into gap 4–5
    const gapTarget = resolvePlayheadTrimTarget(twoClips, 4.5, "b");
    expect(gapTarget).toBeNull();
    const gapPanel = trimPromptPanelState(true, Boolean(gapTarget));
    expect(gapPanel.open).toBe(true);
    expect(gapPanel.showNeedsClipStatus).toBe(true);
    expect(gapPanel.showConfirm).toBe(false);
    expect(gapPanel.showCancel).toBe(true);
    expect(TRIM_NEEDS_CLIP_STATUS).toBe("Move the playhead onto a video clip to trim.");

    // Confirm with missing target must not mutate
    const before = structuredClone(twoClips);
    const afterReject = applyTrimIfTarget(twoClips, 4.5, "after", "b");
    expect(afterReject).toEqual(before);

    // Cancel dismisses trim mode
    const dismissed = trimPromptPanelState(false, Boolean(gapTarget));
    expect(dismissed.open).toBe(false);
    expect(dismissed.showCancel).toBe(false);
    expect(dismissed.showNeedsClipStatus).toBe(false);
  });

  it("VideoEditor wires Cancel outside the trimTarget-only branch", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/VideoEditor.tsx"),
      "utf8"
    );
    expect(src).toContain("trimPromptPanelState");
    expect(src).toContain("TRIM_NEEDS_CLIP_STATUS");
    expect(src).toContain("trimPanel.showCancel");
    // Confirm actions may be gated; Cancel uses showCancel independently.
    const cancelGate = src.indexOf("trimPanel.showCancel");
    expect(cancelGate).toBeGreaterThan(-1);
    const afterGate = src.slice(cancelGate, cancelGate + 400);
    expect(afterGate).toMatch(/Cancel/);
    expect(afterGate).toContain("setTrimPromptOpen(false)");
  });
});
