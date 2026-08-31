import type { GigaEditTimelineClip } from "@/lib/gigaedit/types";
import { MAX_GIGAEDIT_JOIN_CLIPS } from "@/lib/gigaedit/types";
import {
  mainTrackDuration,
  remainingMainJoinSlots,
  sortedMainVideoClips,
} from "@/lib/gigaedit/timelineLayers";

/** Main-track video clips in timeline order (layer 0). */
export function sortedVideoClips(clips: GigaEditTimelineClip[]): GigaEditTimelineClip[] {
  return sortedMainVideoClips(clips);
}

export function joinedTimelineDuration(clips: GigaEditTimelineClip[]): number {
  return mainTrackDuration(clips);
}

export function clipTimelineDuration(clip: GigaEditTimelineClip): number {
  return Math.max(0, clip.endSec - clip.startSec);
}

export function clipSourceDuration(clip: GigaEditTimelineClip): number {
  const start = clip.sourceStartSec ?? 0;
  const end = clip.sourceEndSec ?? clip.endSec - clip.startSec;
  return Math.max(0, end - start);
}

export function clipAtTimelineSec(
  clips: GigaEditTimelineClip[],
  timelineSec: number
): GigaEditTimelineClip | null {
  return (
    sortedMainVideoClips(clips).find(
      (clip) => timelineSec >= clip.startSec && timelineSec < clip.endSec - 0.001
    ) ?? null
  );
}

export function timelineSecToSourceSec(
  clip: GigaEditTimelineClip,
  timelineSec: number
): number {
  const sourceStart = clip.sourceStartSec ?? 0;
  const offset = Math.max(0, timelineSec - clip.startSec);
  const speed = Math.max(0.25, clip.speed || 1);
  return sourceStart + offset * speed;
}

export function sourceSecToTimelineSec(
  clip: GigaEditTimelineClip,
  sourceSec: number
): number {
  const sourceStart = clip.sourceStartSec ?? 0;
  const speed = Math.max(0.25, clip.speed || 1);
  return clip.startSec + Math.max(0, sourceSec - sourceStart) / speed;
}

export function remainingJoinSlots(clips: GigaEditTimelineClip[]): number {
  return remainingMainJoinSlots(clips);
}

export function hasMultipleJoinSources(clips: GigaEditTimelineClip[]): boolean {
  const keys = new Set(
    sortedVideoClips(clips).map((clip) => clip.sourceKey ?? "legacy-primary")
  );
  return keys.size > 1;
}

export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.src = url;
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video duration."));
    };
  });
}

export function buildSequentialVideoClips(
  existing: GigaEditTimelineClip[],
  additions: Array<{ sourceKey: string; label: string; durationSec: number }>
): GigaEditTimelineClip[] {
  const kept = existing.filter((clip) => clip.track !== "video");
  const videoClips = sortedVideoClips(existing);
  let cursor = joinedTimelineDuration(existing);
  const appended = additions.map((item, index) => {
    const startSec = cursor;
    const endSec = cursor + item.durationSec;
    cursor = endSec;
    return {
      id: `clip_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
      track: "video" as const,
      label: item.label,
      startSec,
      endSec,
      speed: 1,
      rotateDeg: 0,
      filterId: "none",
      sourceKey: item.sourceKey,
      sourceStartSec: 0,
      sourceEndSec: item.durationSec,
    };
  });
  return [...kept, ...videoClips, ...appended];
}
