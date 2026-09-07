import type { VideoProject, VideoScene, TextOverlayLayer } from "@/lib/media/videoProject/types";
import { MEDIA_STUDIO_VIDEO_CAPABILITIES } from "@/lib/media/videoProject/cinematicPrompt";
import { findSpellingIssues } from "@/lib/media/videoProject/textOverlays";

export type QualityCheckSeverity = "info" | "warning" | "error";

export type QualityCheckItem = {
  id: string;
  severity: QualityCheckSeverity;
  message: string;
  sceneId?: string;
  overlayId?: string;
};

export type QualityCheckReport = {
  ready: boolean;
  headline: "READY TO EXPORT" | "NEEDS REVIEW";
  items: QualityCheckItem[];
  checkedAt: number;
  disclaimer: string;
};

const DISCLAIMER =
  "Giga3 AI Quality Check uses heuristics only — it cannot guarantee perfect text, audio sync, or artifact detection. Review your project before publishing.";

export function runVideoProjectQualityCheck(project: VideoProject): QualityCheckReport {
  const items: QualityCheckItem[] = [];
  const scenes = [...project.scenes].sort((a, b) => a.order - b.order);

  if (scenes.length === 0) {
    items.push({
      id: "no_scenes",
      severity: "error",
      message: "Add at least one scene before export.",
    });
  }

  for (const scene of scenes) {
    if (scene.status === "failed") {
      items.push({
        id: `scene_failed_${scene.id}`,
        severity: "error",
        message: `Scene "${scene.title}" failed: ${scene.errorMessage ?? "generation error"}. Regenerate or edit the prompt.`,
        sceneId: scene.id,
      });
    } else if (scene.status !== "succeeded" || !scene.outputUrl) {
      items.push({
        id: `scene_missing_${scene.id}`,
        severity: "warning",
        message: `Scene "${scene.title}" is not generated yet.`,
        sceneId: scene.id,
      });
    }
  }

  if (!MEDIA_STUDIO_VIDEO_CAPABILITIES.aspects.includes(project.settings.aspectRatio)) {
    items.push({
      id: "aspect_unsupported",
      severity: "error",
      message: `Aspect ratio ${project.settings.aspectRatio} is not supported by the current video provider.`,
    });
  }

  const spellIssues = findSpellingIssues(project.textOverlays);
  for (const issue of spellIssues.slice(0, 5)) {
    items.push({
      id: `spell_${issue.overlayId}_${issue.word}`,
      severity: "warning",
      message: `Check spelling in overlay text: "${issue.word}" may be misspelled.`,
      overlayId: issue.overlayId,
    });
  }

  for (const overlay of project.textOverlays) {
    if (!overlay.text.trim()) {
      items.push({
        id: `overlay_empty_${overlay.id}`,
        severity: "warning",
        message: `Text overlay (${overlay.kind}) is empty.`,
        overlayId: overlay.id,
      });
    }
    if (overlay.opacity < 0.2) {
      items.push({
        id: `overlay_faint_${overlay.id}`,
        severity: "info",
        message: `Overlay "${overlay.text.slice(0, 24)}" is very faint (opacity ${overlay.opacity}).`,
        overlayId: overlay.id,
      });
    }
  }

  const succeeded = scenes.filter((s) => s.status === "succeeded" && s.outputUrl);
  if (succeeded.length >= 2) {
    items.push({
      id: "continuity_review",
      severity: "info",
      message:
        "Multi-scene project: manually review character, lighting, and location continuity between scenes.",
    });
  }

  if (project.consistency.aiVisualizationLabel && project.consistency.location.country) {
    items.push({
      id: "ai_label_suggested",
      severity: "info",
      message:
        'Consider including an "AI-generated visualization" title overlay when depicting real places fictionally.',
    });
  }

  const hasError = items.some((i) => i.severity === "error");
  const ready = !hasError && succeeded.length > 0;

  return {
    ready,
    headline: ready ? "READY TO EXPORT" : "NEEDS REVIEW",
    items,
    checkedAt: Date.now(),
    disclaimer: DISCLAIMER,
  };
}

export function projectStatusFromScenes(
  scenes: VideoScene[],
  current: VideoProject["status"]
): VideoProject["status"] {
  if (current === "exporting" || current === "completed") return current;
  if (scenes.some((s) => s.status === "generating" || s.status === "queued")) return "generating";
  if (scenes.some((s) => s.status === "failed")) return "needs_review";
  const allDone = scenes.length > 0 && scenes.every((s) => s.status === "succeeded" && s.outputUrl);
  if (allDone) return "ready";
  if (scenes.some((s) => s.status === "succeeded")) return "processing";
  return "draft";
}

export function mergeQualityIntoProject(
  project: VideoProject,
  report: QualityCheckReport
): VideoProject {
  return {
    ...project,
    lastQualityCheckAt: report.checkedAt,
    lastQualityCheckReady: report.ready,
    status: report.ready ? "ready" : "needs_review",
    updatedAt: Date.now(),
  };
}

export type ExportPresetId = "tiktok_reels" | "youtube_landscape" | "square_social";

export const EXPORT_PRESETS: Array<{
  id: ExportPresetId;
  label: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  hint: string;
}> = [
  { id: "tiktok_reels", label: "9:16 vertical", aspectRatio: "9:16", hint: "Short-form vertical video" },
  { id: "youtube_landscape", label: "16:9 landscape", aspectRatio: "16:9", hint: "Wide landscape video" },
  { id: "square_social", label: "1:1 square", aspectRatio: "1:1", hint: "Square social posts" },
];

export function applyExportPresetToProject(
  project: VideoProject,
  presetId: ExportPresetId
): VideoProject {
  const preset = EXPORT_PRESETS.find((p) => p.id === presetId);
  if (!preset) return project;
  return {
    ...project,
    settings: { ...project.settings, aspectRatio: preset.aspectRatio },
    updatedAt: Date.now(),
  };
}

export function estimateProjectCredits(
  sceneCount: number,
  durationSec: number,
  costPerClip: number
): number {
  return Math.max(0, sceneCount) * costPerClip;
}
