import { MEDIA_VIDEO_MAX_DURATION_SEC } from "@/lib/media/videoLimits";
import type { PreProductionScene, VoiceoverSettings } from "@/lib/media/videoPreProduction/types";
import { countWords, estimateSpeechDurationSec } from "@/lib/media/videoPreProduction/scriptUtils";

/** Total output lengths users can request — each clip is capped at 15s server-side. */
export const TARGET_VIDEO_DURATION_OPTIONS = [15, 30, 60, 90, 120, 180] as const;

export type TargetVideoDurationSec = (typeof TARGET_VIDEO_DURATION_OPTIONS)[number];

export type PreProductionSceneJobStatus =
  | "pending"
  | "generating"
  | "succeeded"
  | "failed";

export type PreProductionSceneJob = {
  id: string;
  sceneNumber: number;
  status: PreProductionSceneJobStatus;
  jobId?: string;
  outputUrl?: string;
  errorMessage?: string;
  creditsCharged?: number;
};

export function sceneCountForTargetDuration(targetSec: number): number {
  const safe = Math.max(MEDIA_VIDEO_MAX_DURATION_SEC, Math.round(targetSec));
  return Math.max(1, Math.ceil(safe / MEDIA_VIDEO_MAX_DURATION_SEC));
}

export function clipDurationForGeneration(targetSec: number): 5 | 10 | 15 {
  if (targetSec <= 5) return 5;
  if (targetSec <= 10) return 10;
  return MEDIA_VIDEO_MAX_DURATION_SEC;
}

export function formatTargetDurationLabel(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const minutes = sec / 60;
  return minutes === Math.floor(minutes) ? `${minutes} min` : `${minutes.toFixed(1)} min`;
}

function mergeSceneChunks(chunks: string[], targetCount: number): string[] {
  if (chunks.length <= targetCount) return chunks;
  const merged: string[] = [];
  const perGroup = chunks.length / targetCount;
  for (let i = 0; i < targetCount; i += 1) {
    const start = Math.floor(i * perGroup);
    const end = Math.floor((i + 1) * perGroup);
    merged.push(chunks.slice(start, end).join(" "));
  }
  return merged.filter(Boolean);
}

function splitTextIntoWordChunks(text: string, chunkCount: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const perChunk = Math.max(1, Math.ceil(words.length / chunkCount));
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += perChunk) {
    chunks.push(words.slice(i, i + perChunk).join(" "));
  }
  return chunks.slice(0, chunkCount);
}

/** Redistribute script content into exactly `sceneCount` scenes for long-video generation. */
export function planLongVideoScenes(script: string, targetDurationSec: number): PreProductionScene[] {
  const sceneCount = sceneCountForTargetDuration(targetDurationSec);
  const lines = script
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const numbered = lines.filter((l) => /^(scene\s*)?\d+[\).:\-—]/i.test(l) || /^[-*•]/.test(l));
  let chunks =
    numbered.length >= 2
      ? numbered.map((l) =>
          l.replace(/^(scene\s*)?\d+[\).:\-—]\s*/i, "").replace(/^[-*•]\s*/, "")
        )
      : script
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 8);

  if (chunks.length === 0 && script.trim()) {
    chunks = [script.trim()];
  }

  if (chunks.length > sceneCount) {
    chunks = mergeSceneChunks(chunks, sceneCount);
  } else if (chunks.length < sceneCount) {
    const flat = chunks.join(" ") || script.trim();
    chunks = splitTextIntoWordChunks(flat, sceneCount);
  }

  while (chunks.length < sceneCount) {
    chunks.push(chunks[chunks.length - 1] ?? script.trim());
  }

  return chunks.slice(0, sceneCount).map((chunk, index) => {
    const visualMatch = chunk.match(/\[([^\]]+)\]/);
    const visualPrompt = visualMatch?.[1]?.trim() || chunk.slice(0, 140);
    const narration = chunk.replace(/\[[^\]]+\]/g, "").trim() || chunk;
    return {
      id: `scene_${index + 1}`,
      sceneNumber: index + 1,
      narration,
      visualPrompt,
      durationSec: MEDIA_VIDEO_MAX_DURATION_SEC,
    };
  });
}

/** Pull a short character/subject hint from the script for cross-scene consistency. */
export function extractCharacterContext(script: string, idea: string): string {
  const combined = `${idea}\n${script}`;
  const characterLine = combined
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => /\b(character|protagonist|host|narrator|presenter|subject)\b/i.test(l));
  if (characterLine) return characterLine.replace(/^[^:]+:\s*/i, "").slice(0, 200);

  const titleMatch = combined.match(/title:\s*(.+)/i);
  if (titleMatch?.[1]) return `Same subject and visual identity as "${titleMatch[1].trim()}".`;

  const firstSentence = combined.split(/(?<=[.!?])\s+/)[0]?.trim();
  if (firstSentence && firstSentence.length > 20) {
    return `Maintain the same main subject and look established in: ${firstSentence.slice(0, 160)}`;
  }
  return "Maintain the same main character, wardrobe, and visual identity across all scenes.";
}

export function buildPreProductionScenePrompt(args: {
  scene: PreProductionScene;
  sceneIndex: number;
  totalScenes: number;
  approvedScript: string;
  characterContext: string;
  voiceover: VoiceoverSettings;
}): string {
  const voiceLabel = args.voiceover.voiceName || "natural narrator";
  const sceneLabel = `Scene ${args.sceneIndex + 1} of ${args.totalScenes}`;
  return [
    `Create ${sceneLabel} of a longer cinematic video. ${args.characterContext}`,
    `Narration for this clip (${voiceLabel}):`,
    args.scene.narration.trim(),
    `Visual direction: ${args.scene.visualPrompt.trim()}`,
    "Keep the same character appearance, wardrobe, and setting continuity with adjacent scenes.",
    "Sync motion and visuals to this clip's narration. Smooth pacing, no on-screen gibberish text.",
    args.sceneIndex === 0
      ? "Opening scene — establish the subject clearly for later scenes."
      : args.sceneIndex === args.totalScenes - 1
        ? "Final scene — close the story with a satisfying ending."
        : "Continue the story naturally from the previous scene.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function createSceneJobsFromScenes(scenes: PreProductionScene[]): PreProductionSceneJob[] {
  return scenes.map((scene) => ({
    id: scene.id,
    sceneNumber: scene.sceneNumber,
    status: "pending" as const,
  }));
}

export function estimateLongVideoCredits(targetDurationSec: number, costPerClip: number): number {
  return sceneCountForTargetDuration(targetDurationSec) * costPerClip;
}

export function narrationWordsPerScene(script: string, sceneCount: number): number {
  const words = countWords(script);
  return Math.max(1, Math.round(words / Math.max(1, sceneCount)));
}

export function targetDurationFromSpeechEstimate(speechSec: number): TargetVideoDurationSec {
  const padded = Math.max(MEDIA_VIDEO_MAX_DURATION_SEC, Math.ceil(speechSec / 5) * 5);
  let best: TargetVideoDurationSec = TARGET_VIDEO_DURATION_OPTIONS[0];
  for (const option of TARGET_VIDEO_DURATION_OPTIONS) {
    if (option >= padded) {
      best = option;
      break;
    }
    best = option;
  }
  return best;
}

export function speechFitsTarget(script: string, targetSec: number): boolean {
  const speechSec = estimateSpeechDurationSec(script);
  const capacity = sceneCountForTargetDuration(targetSec) * MEDIA_VIDEO_MAX_DURATION_SEC;
  return speechSec <= capacity * 1.15;
}
