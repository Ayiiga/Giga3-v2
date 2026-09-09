import { buildSequentialVideoClips } from "@/lib/gigaedit/timelineJoin";
import type { GigaEditTimelineClip } from "@/lib/gigaedit/types";
import { MAX_GIGAEDIT_JOIN_CLIPS } from "@/lib/gigaedit/types";

export type VideoFileImportCandidate = {
  file: File;
  sourceKey: string;
  label: string;
  durationSec: number;
  thumb?: string;
};

export type VideoFileImportFailure = {
  fileName: string;
  reason: string;
};

export type PlanVideoFileImportInput = {
  files: File[];
  mode: "replace" | "append";
  existingClips: GigaEditTimelineClip[];
  remainingSlots: number;
};

export type PlanVideoFileImportResult = {
  mode: "replace" | "append";
  /** Files that will be attempted (may still fail duration read at runtime). */
  selectedFiles: File[];
  skippedOverLimit: number;
  failures: VideoFileImportFailure[];
};

export function isVideoImportFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "mp4" || ext === "mov" || ext === "webm" || ext === "m4v";
}

export function makeImportSourceKey(index: number, mode: "replace" | "append"): string {
  if (mode === "replace" && index === 0) return "primary";
  return `src_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clipLabelFromFileName(fileName: string, fallbackIndex: number): string {
  return fileName.replace(/\.[^.]+$/, "").slice(0, 18) || `Clip ${fallbackIndex + 1}`;
}

/** Plan which local files will be imported and detect non-video selections up front. */
export function planVideoFileImport(input: PlanVideoFileImportInput): PlanVideoFileImportResult {
  const failures: VideoFileImportFailure[] = [];
  const videos = input.files.filter((file) => {
    if (isVideoImportFile(file)) return true;
    failures.push({
      fileName: file.name,
      reason: "Not a supported video file (use MP4, MOV, WebM, or M4V).",
    });
    return false;
  });

  const slotCap =
    input.mode === "replace" ? MAX_GIGAEDIT_JOIN_CLIPS : Math.max(0, input.remainingSlots);
  const selectedFiles = videos.slice(0, slotCap);
  const skippedOverLimit = Math.max(0, videos.length - selectedFiles.length);

  if (skippedOverLimit > 0) {
    const skippedNames = videos.slice(slotCap).map((f) => f.name).join(", ");
    failures.push({
      fileName: skippedNames,
      reason: `Main track supports up to ${MAX_GIGAEDIT_JOIN_CLIPS} clips (${skippedOverLimit} not imported).`,
    });
  }

  return {
    mode: input.mode,
    selectedFiles,
    skippedOverLimit,
    failures,
  };
}

export function buildClipsFromImportCandidates(
  existingClips: GigaEditTimelineClip[],
  mode: "replace" | "append",
  candidates: VideoFileImportCandidate[]
): GigaEditTimelineClip[] {
  const additions = candidates.map((c) => ({
    sourceKey: c.sourceKey,
    label: c.label,
    durationSec: c.durationSec,
  }));

  const base =
    mode === "replace"
      ? existingClips.filter((clip) => clip.track !== "video" || (clip.videoLayer ?? 0) > 0)
      : existingClips;

  const nextClips = buildSequentialVideoClips(base, additions);

  return nextClips.map((clip) => {
    const candidate = candidates.find((c) => c.sourceKey === clip.sourceKey);
    return candidate?.thumb ? { ...clip, clipThumbnailDataUrl: candidate.thumb } : clip;
  });
}

export function formatImportResultMessage(
  mode: "replace" | "append",
  importedCount: number,
  totalOnMainTrack: number,
  failures: VideoFileImportFailure[]
): string {
  const parts: string[] = [];
  if (importedCount > 0) {
    parts.push(
      mode === "replace"
        ? `Imported ${importedCount} video${importedCount === 1 ? "" : "s"} on the main track.`
        : `Added ${importedCount} clip${importedCount === 1 ? "" : "s"} to main track (${totalOnMainTrack}/${MAX_GIGAEDIT_JOIN_CLIPS}).`
    );
  }
  if (failures.length > 0) {
    const detail = failures
      .slice(0, 3)
      .map((f) => `${f.fileName}: ${f.reason}`)
      .join(" · ");
    parts.push(
      failures.length === 1 ? `Failed: ${detail}` : `${failures.length} issue(s): ${detail}`
    );
  }
  return parts.join(" ") || "No videos were imported.";
}
