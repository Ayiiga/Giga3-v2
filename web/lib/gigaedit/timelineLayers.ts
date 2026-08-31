import { roundToFrame } from "@/lib/gigaedit/frameTime";
import type {
  GigaEditTimelineClip,
  GigaEditTimelineLane,
  OverlayLayoutPreset,
  OverlayPositionPreset,
  VideoResizeMode,
} from "@/lib/gigaedit/types";
import { MAX_GIGAEDIT_JOIN_CLIPS } from "@/lib/gigaedit/types";
import { inferClipLane, laneLabel } from "@/lib/gigaedit/timelineLanes";
import type { DeviceTier } from "@/lib/gigaedit/deviceCapability";

export const MAIN_VIDEO_LAYER = 0;

export function clipVideoLayer(clip: GigaEditTimelineClip): number {
  if (clip.track !== "video") return -1;
  return clip.videoLayer ?? MAIN_VIDEO_LAYER;
}

export function isOverlayClip(clip: GigaEditTimelineClip): boolean {
  if (clip.track !== "video") return false;
  if (clip.clipRole === "overlay") return true;
  return clipVideoLayer(clip) > MAIN_VIDEO_LAYER;
}

export function isMainVideoClip(clip: GigaEditTimelineClip): boolean {
  return clip.track === "video" && !isOverlayClip(clip);
}

export function normalizeVideoClip(clip: GigaEditTimelineClip): GigaEditTimelineClip {
  if (clip.track !== "video") return clip;
  const layer = clipVideoLayer(clip);
  const overlay = layer > MAIN_VIDEO_LAYER || clip.clipRole === "overlay";
  return {
    ...clip,
    videoLayer: layer,
    clipRole: overlay ? "overlay" : "main",
    posX: clip.posX ?? 0.5,
    posY: clip.posY ?? 0.5,
    scaleX: clip.scaleX ?? 1,
    scaleY: clip.scaleY ?? 1,
    opacity: clip.opacity ?? 1,
    volume: clip.volume ?? 1,
    muted: clip.muted ?? false,
    locked: clip.locked ?? false,
    visible: clip.visible ?? true,
    resizeMode: clip.resizeMode ?? "contain",
    cropLeft: clip.cropLeft ?? 0,
    cropTop: clip.cropTop ?? 0,
    cropRight: clip.cropRight ?? 0,
    cropBottom: clip.cropBottom ?? 0,
    maskShape: clip.maskShape ?? "none",
    maskFeather: clip.maskFeather ?? 0,
    borderWidth: clip.borderWidth ?? 0,
    borderColor: clip.borderColor ?? "#ffffff",
    shadowBlur: clip.shadowBlur ?? 0,
    roundedRadius: clip.roundedRadius ?? 0,
    blendMode: clip.blendMode ?? "source-over",
  };
}

export function migrateTimelineClips(clips: GigaEditTimelineClip[]): GigaEditTimelineClip[] {
  return clips.map((clip) => {
    const normalized = clip.track === "video" ? normalizeVideoClip(clip) : clip;
    return { ...normalized, timelineLane: inferClipLane(normalized) };
  });
}

export function sortedMainVideoClips(clips: GigaEditTimelineClip[]): GigaEditTimelineClip[] {
  return clips
    .filter(isMainVideoClip)
    .sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec);
}

export function sortedOverlayClips(
  clips: GigaEditTimelineClip[],
  layer?: number
): GigaEditTimelineClip[] {
  return clips
    .filter((c) => isOverlayClip(c) && (layer === undefined || clipVideoLayer(c) === layer))
    .sort((a, b) => a.startSec - b.startSec);
}

export function allVideoClips(clips: GigaEditTimelineClip[]): GigaEditTimelineClip[] {
  return clips.filter((c) => c.track === "video").sort((a, b) => a.startSec - b.startSec);
}

export function videoLayerIds(clips: GigaEditTimelineClip[]): number[] {
  const layers = new Set<number>();
  for (const clip of clips) {
    if (clip.track === "video") layers.add(clipVideoLayer(clip));
  }
  return [...layers].sort((a, b) => a - b);
}

export function projectTimelineDuration(clips: GigaEditTimelineClip[]): number {
  let max = 0;
  for (const clip of clips) {
    if (clip.track === "video" || clip.track === "audio") {
      max = Math.max(max, clip.endSec);
    }
  }
  return roundToFrame(max);
}

export function mainTrackDuration(clips: GigaEditTimelineClip[]): number {
  const main = sortedMainVideoClips(clips);
  if (main.length === 0) return 0;
  return roundToFrame(main[main.length - 1].endSec);
}

export function nextOverlayLayer(clips: GigaEditTimelineClip[]): number {
  const overlayLayers = videoLayerIds(clips).filter((l) => l > MAIN_VIDEO_LAYER);
  if (overlayLayers.length === 0) return 1;
  return Math.max(...overlayLayers) + 1;
}

export function maxOverlayCountForTier(tier: DeviceTier): number {
  if (tier === "low") return 4;
  if (tier === "high") return 12;
  return 8;
}

export function maxVideoLayersForTier(tier: DeviceTier): number {
  if (tier === "low") return 4;
  if (tier === "high") return 9;
  return 6;
}

export function remainingMainJoinSlots(clips: GigaEditTimelineClip[]): number {
  return Math.max(0, MAX_GIGAEDIT_JOIN_CLIPS - sortedMainVideoClips(clips).length);
}

export function remainingOverlaySlots(clips: GigaEditTimelineClip[], tier: DeviceTier): number {
  return Math.max(0, maxOverlayCountForTier(tier) - sortedOverlayClips(clips).length);
}

export function clipActiveAtTime(clip: GigaEditTimelineClip, timelineSec: number): boolean {
  return timelineSec >= clip.startSec - 0.001 && timelineSec < clip.endSec - 0.001;
}

export function mainClipAtTimelineSec(
  clips: GigaEditTimelineClip[],
  timelineSec: number
): GigaEditTimelineClip | null {
  return sortedMainVideoClips(clips).find((clip) => clipActiveAtTime(clip, timelineSec)) ?? null;
}

export function overlaysAtTimelineSec(
  clips: GigaEditTimelineClip[],
  timelineSec: number
): GigaEditTimelineClip[] {
  return sortedOverlayClips(clips).filter(
    (clip) => clip.visible !== false && clipActiveAtTime(clip, timelineSec)
  );
}

export function timelineSecToClipSourceSec(
  clip: GigaEditTimelineClip,
  timelineSec: number
): number {
  const sourceStart = clip.sourceStartSec ?? 0;
  const offset = Math.max(0, timelineSec - clip.startSec);
  const speed = Math.max(0.25, clip.speed || 1);
  return roundToFrame(sourceStart + offset * speed);
}

export function clipSourceSecToTimelineSec(
  clip: GigaEditTimelineClip,
  sourceSec: number
): number {
  const sourceStart = clip.sourceStartSec ?? 0;
  const speed = Math.max(0.25, clip.speed || 1);
  return roundToFrame(clip.startSec + Math.max(0, sourceSec - sourceStart) / speed);
}

export type SnapTarget = { sec: number; label: string };

export function collectSnapTargets(
  clips: GigaEditTimelineClip[],
  playhead: number,
  excludeClipId?: string
): SnapTarget[] {
  const targets: SnapTarget[] = [
    { sec: 0, label: "start" },
    { sec: roundToFrame(playhead), label: "playhead" },
  ];
  for (const clip of clips) {
    if (clip.id === excludeClipId) continue;
    targets.push({ sec: roundToFrame(clip.startSec), label: "clip-start" });
    targets.push({ sec: roundToFrame(clip.endSec), label: "clip-end" });
  }
  return targets;
}

const SNAP_THRESHOLD_SEC = 0.12;

export function snapTimelineSec(
  sec: number,
  clips: GigaEditTimelineClip[],
  playhead: number,
  enabled: boolean,
  excludeClipId?: string
): number {
  const rounded = roundToFrame(sec);
  if (!enabled) return rounded;
  const targets = collectSnapTargets(clips, playhead, excludeClipId);
  let best = rounded;
  let bestDist = SNAP_THRESHOLD_SEC;
  for (const target of targets) {
    const dist = Math.abs(target.sec - rounded);
    if (dist <= bestDist) {
      bestDist = dist;
      best = target.sec;
    }
  }
  return best;
}

export function buildOverlayClip(input: {
  sourceKey: string;
  label: string;
  durationSec: number;
  playheadSec: number;
  videoLayer: number;
  thumbnailDataUrl?: string;
  timelineLane?: GigaEditTimelineLane;
  cameraId?: string;
}): GigaEditTimelineClip {
  const startSec = roundToFrame(Math.max(0, input.playheadSec));
  const endSec = roundToFrame(startSec + input.durationSec);
  const lane = input.timelineLane ?? "b-roll";
  return normalizeVideoClip({
    id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    track: "video",
    label: input.label,
    startSec,
    endSec,
    speed: 1,
    rotateDeg: 0,
    filterId: "none",
    sourceKey: input.sourceKey,
    sourceStartSec: 0,
    sourceEndSec: input.durationSec,
    videoLayer: input.videoLayer,
    clipRole: "overlay",
    clipThumbnailDataUrl: input.thumbnailDataUrl,
    timelineLane: lane,
    cameraId: input.cameraId,
  });
}

export function duplicateClipAsOverlay(
  clip: GigaEditTimelineClip,
  clips: GigaEditTimelineClip[],
  playheadSec: number
): GigaEditTimelineClip {
  const layer = nextOverlayLayer(clips);
  const duration = Math.max(0.25, clip.endSec - clip.startSec);
  return normalizeVideoClip({
    ...clip,
    id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    videoLayer: layer,
    clipRole: "overlay",
    startSec: roundToFrame(playheadSec),
    endSec: roundToFrame(playheadSec + duration),
    locked: false,
    label: `${clip.label} overlay`,
  });
}

export function applyPositionPreset(
  clip: GigaEditTimelineClip,
  preset: OverlayPositionPreset
): GigaEditTimelineClip {
  const positions: Record<OverlayPositionPreset, { posX: number; posY: number }> = {
    "top-left": { posX: 0.18, posY: 0.18 },
    "top-center": { posX: 0.5, posY: 0.18 },
    "top-right": { posX: 0.82, posY: 0.18 },
    "center-left": { posX: 0.18, posY: 0.5 },
    center: { posX: 0.5, posY: 0.5 },
    "center-right": { posX: 0.82, posY: 0.5 },
    "bottom-left": { posX: 0.18, posY: 0.82 },
    "bottom-center": { posX: 0.5, posY: 0.82 },
    "bottom-right": { posX: 0.82, posY: 0.82 },
  };
  const pos = positions[preset];
  return { ...clip, ...pos };
}

export function applySmartResize(
  clip: GigaEditTimelineClip,
  mode: VideoResizeMode
): GigaEditTimelineClip {
  const uniform = mode === "original" ? 1 : mode === "fill" || mode === "cover" ? 1.05 : 0.85;
  return {
    ...clip,
    resizeMode: mode,
    scaleX: uniform,
    scaleY: uniform,
  };
}

export function applyLayoutPreset(
  clip: GigaEditTimelineClip,
  preset: OverlayLayoutPreset
): GigaEditTimelineClip {
  switch (preset) {
    case "pip-25":
      return {
        ...applyPositionPreset(applySmartResize(clip, "contain"), "bottom-right"),
        scaleX: 0.25,
        scaleY: 0.25,
        borderWidth: 2,
        shadowBlur: 8,
      };
    case "pip-40":
      return {
        ...applyPositionPreset(applySmartResize(clip, "contain"), "bottom-right"),
        scaleX: 0.4,
        scaleY: 0.4,
        borderWidth: 2,
        shadowBlur: 8,
      };
    case "pip-50":
      return {
        ...applyPositionPreset(applySmartResize(clip, "contain"), "center"),
        scaleX: 0.5,
        scaleY: 0.5,
        borderWidth: 2,
      };
    case "pip-75":
      return {
        ...applyPositionPreset(applySmartResize(clip, "contain"), "center"),
        scaleX: 0.75,
        scaleY: 0.75,
      };
    case "side-by-side":
      return {
        ...applySmartResize(clip, "cover"),
        posX: 0.75,
        posY: 0.5,
        scaleX: 0.48,
        scaleY: 0.9,
      };
    case "split-top-bottom":
      return {
        ...applySmartResize(clip, "cover"),
        posX: 0.5,
        posY: 0.25,
        scaleX: 0.95,
        scaleY: 0.45,
      };
    case "circle-camera":
      return {
        ...applyPositionPreset(applySmartResize(clip, "cover"), "bottom-right"),
        scaleX: 0.32,
        scaleY: 0.32,
        maskShape: "circle",
        maskFeather: 4,
        borderWidth: 3,
        borderColor: "#ffffff",
      };
    case "floating":
      return {
        ...applyPositionPreset(applySmartResize(clip, "contain"), "bottom-right"),
        scaleX: 0.35,
        scaleY: 0.35,
        shadowBlur: 16,
        roundedRadius: 12,
      };
    default:
      return clip;
  }
}

export function reorderVideoLayer(
  clips: GigaEditTimelineClip[],
  layer: number,
  direction: "up" | "down"
): GigaEditTimelineClip[] {
  const layers = videoLayerIds(clips);
  const index = layers.indexOf(layer);
  if (index < 0) return clips;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= layers.length) return clips;
  const swapLayer = layers[swapIndex];
  return clips.map((clip) => {
    if (clip.track !== "video") return clip;
    const l = clipVideoLayer(clip);
    if (l === layer) return { ...clip, videoLayer: swapLayer };
    if (l === swapLayer) return { ...clip, videoLayer: layer };
    return clip;
  });
}

export function hasOverlayVideos(clips: GigaEditTimelineClip[]): boolean {
  return sortedOverlayClips(clips).length > 0;
}

export function layerDisplayName(layer: number, clips: GigaEditTimelineClip[] = []): string {
  if (layer === MAIN_VIDEO_LAYER) return laneLabel("main-video");
  const sample = clips.find((c) => clipVideoLayer(c) === layer);
  if (sample) return laneLabel(inferClipLane(sample));
  return `Overlay ${layer}`;
}
