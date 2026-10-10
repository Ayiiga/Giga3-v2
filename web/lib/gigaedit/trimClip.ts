/**
 * Predictable playhead trim for GigaEdit — keep footage before or after the playhead.
 * Timeline edge handles remain the primary precise in/out control.
 */

import type { GigaEditTimelineClip } from "@/lib/gigaedit/types";
import { timelineSecToSourceSec } from "@/lib/gigaedit/timelineJoin";

export type PlayheadTrimSide = "after" | "before";

export type PlayheadTrimPreview = {
  side: PlayheadTrimSide;
  /** Human-readable remaining source range, e.g. "0:05–0:18". */
  remainingLabel: string;
  sourceStartSec: number;
  sourceEndSec: number;
  timelineStartSec: number;
  timelineEndSec: number;
  /** False when playhead is too close to that edge to trim. */
  viable: boolean;
};

const MIN_TRIM_SEC = 0.25;

function formatRangeSec(start: number, end: number): string {
  const fmt = (sec: number) => {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };
  return `${fmt(start)}–${fmt(end)}`;
}

/** Source in/out bounds for a clip (defaults match import semantics). */
export function clipSourceBounds(clip: GigaEditTimelineClip): {
  sourceStart: number;
  sourceEnd: number;
} {
  const sourceStart = clip.sourceStartSec ?? 0;
  const sourceEnd = clip.sourceEndSec ?? sourceStart + Math.max(0, clip.endSec - clip.startSec);
  return { sourceStart, sourceEnd };
}

/**
 * Preview what remains if the user keeps footage after or before the playhead.
 * Does not mutate the clip.
 */
export function previewPlayheadTrim(
  clip: GigaEditTimelineClip,
  playheadSec: number,
  side: PlayheadTrimSide
): PlayheadTrimPreview {
  const { sourceStart, sourceEnd } = clipSourceBounds(clip);
  const speed = Math.max(0.25, clip.speed || 1);
  const sourcePlayhead = timelineSecToSourceSec(clip, playheadSec);

  if (side === "after") {
    const nextSourceStart = Math.max(sourceStart, Math.min(sourcePlayhead, sourceEnd - MIN_TRIM_SEC));
    const nextSourceEnd = sourceEnd;
    const timelineDur = Math.max(MIN_TRIM_SEC, (nextSourceEnd - nextSourceStart) / speed);
    const viable =
      sourcePlayhead > sourceStart + MIN_TRIM_SEC * 0.5 &&
      nextSourceEnd - nextSourceStart >= MIN_TRIM_SEC;
    return {
      side,
      remainingLabel: formatRangeSec(nextSourceStart, nextSourceEnd),
      sourceStartSec: nextSourceStart,
      sourceEndSec: nextSourceEnd,
      timelineStartSec: clip.startSec,
      timelineEndSec: clip.startSec + timelineDur,
      viable,
    };
  }

  const nextSourceStart = sourceStart;
  const nextSourceEnd = Math.min(sourceEnd, Math.max(sourcePlayhead, sourceStart + MIN_TRIM_SEC));
  const timelineDur = Math.max(MIN_TRIM_SEC, (nextSourceEnd - nextSourceStart) / speed);
  const viable =
    sourcePlayhead < sourceEnd - MIN_TRIM_SEC * 0.5 &&
    nextSourceEnd - nextSourceStart >= MIN_TRIM_SEC;
  return {
    side,
    remainingLabel: formatRangeSec(nextSourceStart, nextSourceEnd),
    sourceStartSec: nextSourceStart,
    sourceEndSec: nextSourceEnd,
    timelineStartSec: clip.startSec,
    timelineEndSec: clip.startSec + timelineDur,
    viable,
  };
}

/** Apply a confirmed playhead trim. Returns the same clip if not viable. */
export function applyPlayheadTrim(
  clip: GigaEditTimelineClip,
  playheadSec: number,
  side: PlayheadTrimSide
): GigaEditTimelineClip {
  const preview = previewPlayheadTrim(clip, playheadSec, side);
  if (!preview.viable) return clip;
  return {
    ...clip,
    sourceStartSec: preview.sourceStartSec,
    sourceEndSec: preview.sourceEndSec,
    startSec: preview.timelineStartSec,
    endSec: preview.timelineEndSec,
    label: side === "after" ? "Trimmed (keep after)" : "Trimmed (keep before)",
  };
}
