import { aspectRatioSize } from "@/lib/gigaedit/exportFormats";
import { joinedTimelineDuration } from "@/lib/gigaedit/timelineJoin";
import type { GigaEditProjectRecord } from "@/lib/gigaedit/projects";
import type { ExportAspectRatio } from "@/lib/gigaedit/types";

export function formatProjectDuration(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function resolutionLabelForAspect(ratio: ExportAspectRatio): string {
  const { width, height } = aspectRatioSize(ratio);
  return `${width}×${height}`;
}

export function computeProjectDurationSec(project: GigaEditProjectRecord): number {
  if (typeof project.durationSec === "number" && project.durationSec > 0) {
    return project.durationSec;
  }
  const fromClips = joinedTimelineDuration(project.clips);
  return fromClips > 0 ? fromClips : 0;
}

export function formatRelativeEditedAt(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: diffDay > 365 ? "numeric" : undefined,
  });
}

export function projectStatusLabel(status: GigaEditProjectRecord["status"]): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "ready":
      return "Ready";
    case "exported":
      return "Exported";
    default:
      return status;
  }
}

export function projectKindEmoji(kind: GigaEditProjectRecord["kind"]): string {
  switch (kind) {
    case "video":
      return "🎥";
    case "photo":
      return "📷";
    case "teleprompter":
      return "🎤";
    case "audio":
      return "🎵";
    case "social":
      return "📱";
    case "template":
      return "🎨";
    default:
      return "📂";
  }
}
