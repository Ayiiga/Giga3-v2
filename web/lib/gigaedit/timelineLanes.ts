import { roundToFrame } from "@/lib/gigaedit/frameTime";
import type { GigaEditTimelineClip, GigaEditTimelineLane } from "@/lib/gigaedit/types";

export type TimelineLaneDef = {
  id: GigaEditTimelineLane;
  label: string;
  /** CSS modifier for clip bar color. */
  tone: string;
};

/** Fixed lane order — matches Creator Studio timeline spec. */
export const TIMELINE_LANES: TimelineLaneDef[] = [
  { id: "main-video", label: "Main Video", tone: "main" },
  { id: "b-roll", label: "B-Roll", tone: "broll" },
  { id: "cutout-person", label: "Cutout Person", tone: "cutout" },
  { id: "screen-recording", label: "Screen Recording", tone: "screen" },
  { id: "logo", label: "Logo", tone: "logo" },
  { id: "text", label: "Text", tone: "text" },
  { id: "captions", label: "Captions", tone: "captions" },
];

export function laneLabel(lane: GigaEditTimelineLane): string {
  return TIMELINE_LANES.find((row) => row.id === lane)?.label ?? lane;
}

export function inferClipLane(clip: GigaEditTimelineClip): GigaEditTimelineLane {
  if (clip.timelineLane) return clip.timelineLane;
  if (clip.track === "text" || clip.track === "sticker") return "text";
  if (clip.track === "video") {
    const layer = clip.videoLayer ?? 0;
    const overlay = layer > 0 || clip.clipRole === "overlay";
    if (!overlay) return "main-video";
    if (clip.cameraId === "screen") return "screen-recording";
    if (clip.maskShape && clip.maskShape !== "none") return "cutout-person";
    if (clip.chromaKeyColor) return "cutout-person";
    return "b-roll";
  }
  return "main-video";
}

export function clipsForLane(
  clips: GigaEditTimelineClip[],
  lane: GigaEditTimelineLane
): GigaEditTimelineClip[] {
  return clips
    .filter((clip) => inferClipLane(clip) === lane)
    .sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec);
}

export function overlayLanes(): GigaEditTimelineLane[] {
  return ["b-roll", "cutout-person", "screen-recording"];
}

/** Lanes that accept dragged clips (logo/captions are synthetic). */
export const DRAGGABLE_LANES: GigaEditTimelineLane[] = [
  "main-video",
  ...overlayLanes(),
  "text",
];

export function formatRulerTime(sec: number): string {
  const safe = Math.max(0, sec);
  const totalSec = Math.floor(safe);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Ruler tick positions (seconds) with readable spacing. */
export function timelineRulerTicks(durationSec: number, maxLabels = 5): number[] {
  const max = Math.max(durationSec, 4);
  const rawStep = max / Math.max(1, maxLabels - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 0.001))));
  const normalized = rawStep / magnitude;
  let step = magnitude;
  if (normalized <= 1) step = magnitude;
  else if (normalized <= 2) step = 2 * magnitude;
  else if (normalized <= 5) step = 5 * magnitude;
  else step = 10 * magnitude;
  step = Math.max(1, step);

  const ticks: number[] = [0];
  for (let t = step; t < max - 0.001; t += step) {
    ticks.push(roundToFrame(t));
  }
  if (ticks[ticks.length - 1] < max - 0.01) {
    ticks.push(roundToFrame(max));
  }
  return ticks;
}

export type SyntheticLaneBar = {
  id: string;
  lane: GigaEditTimelineLane;
  label: string;
  startSec: number;
  endSec: number;
  readOnly: true;
};

export function syntheticLogoBar(
  durationSec: number,
  hasBrand: boolean,
  label = "Giga3 AI"
): SyntheticLaneBar | null {
  if (!hasBrand || durationSec <= 0) return null;
  return {
    id: "synthetic-logo",
    lane: "logo",
    label,
    startSec: 0,
    endSec: durationSec,
    readOnly: true,
  };
}

export function syntheticCaptionsBar(
  durationSec: number,
  hasCaptions: boolean
): SyntheticLaneBar | null {
  if (!hasCaptions || durationSec <= 0) return null;
  return {
    id: "synthetic-captions",
    lane: "captions",
    label: "Captions",
    startSec: 0,
    endSec: durationSec,
    readOnly: true,
  };
}
