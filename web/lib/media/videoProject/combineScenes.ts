import type { ExportAspectRatio } from "@/lib/gigaedit/types";
import { exportJoinedVideoClips, type JoinedVideoSegment } from "@/lib/gigaedit/videoExport";
import { readVideoDuration } from "@/lib/gigaedit/timelineJoin";
import { fetchAsBlob } from "@/lib/share/clientShare";
import type { VideoScene } from "@/lib/media/videoProject/types";

export type CombinedVideoStatus = "idle" | "combining" | "ready" | "failed";

export function orderedSceneOutputUrls(scenes: VideoScene[]): string[] {
  return [...scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) => scene.outputUrl)
    .filter((url): url is string => Boolean(url));
}

/** Stable key — when scene outputs change, the combined video should be rebuilt. */
export function sceneOutputFingerprint(scenes: VideoScene[]): string {
  return orderedSceneOutputUrls(scenes).join("|");
}

export function allScenesReady(scenes: VideoScene[]): boolean {
  const sorted = [...scenes].sort((a, b) => a.order - b.order);
  return (
    sorted.length > 0 &&
    sorted.every((scene) => scene.status === "succeeded" && Boolean(scene.outputUrl))
  );
}

export function shouldRebuildCombinedVideo(
  scenes: VideoScene[],
  fingerprint?: string,
  status?: CombinedVideoStatus
): boolean {
  if (!allScenesReady(scenes)) return false;
  if (status === "combining") return false;
  const next = sceneOutputFingerprint(scenes);
  return !fingerprint || fingerprint !== next;
}

function safeFileBase(title: string): string {
  const base = title.trim().replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
  return base || "giga3-video-project";
}

async function remoteUrlToFile(url: string, index: number): Promise<File> {
  const blob = await fetchAsBlob(url);
  const ext = blob.type.includes("webm") ? "webm" : "mp4";
  return new File([blob], `scene-${index + 1}.${ext}`, {
    type: blob.type || "video/mp4",
  });
}

/** Join scene clips into one exportable file (browser Canvas + MediaRecorder). */
export async function combineSceneVideos(options: {
  sceneUrls: string[];
  aspectRatio: ExportAspectRatio;
  projectTitle: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<{ file: File; durationSec: number }> {
  const { sceneUrls, aspectRatio, projectTitle, onProgress, signal } = options;
  if (sceneUrls.length === 0) {
    throw new Error("Add at least one generated scene before combining.");
  }

  if (sceneUrls.length === 1) {
    const file = await remoteUrlToFile(sceneUrls[0], 0);
    const durationSec = await readVideoDuration(file);
    const ext = file.type.includes("webm") ? "webm" : "mp4";
    return {
      file: new File([file], `${safeFileBase(projectTitle)}.${ext}`, { type: file.type }),
      durationSec,
    };
  }

  const segments: JoinedVideoSegment[] = [];
  let totalDurationSec = 0;
  for (let index = 0; index < sceneUrls.length; index += 1) {
    const file = await remoteUrlToFile(sceneUrls[index], index);
    const durationSec = await readVideoDuration(file);
    totalDurationSec += durationSec;
    segments.push({
      file,
      sourceStartSec: 0,
      sourceEndSec: durationSec,
      speed: 1,
    });
  }

  const exported = await exportJoinedVideoClips(segments, {
    aspectRatio,
    audioMode: "original",
    onProgress,
    signal,
  });

  const ext = exported.file.name.includes(".webm") ? "webm" : "mp4";
  const combined = new File(
    [exported.file],
    `${safeFileBase(projectTitle)}-combined.${ext}`,
    { type: exported.file.type }
  );
  return { file: combined, durationSec: exported.durationSec || totalDurationSec };
}
