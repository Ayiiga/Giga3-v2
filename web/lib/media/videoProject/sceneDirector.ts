import {
  newSceneId,
  type VideoScene,
  type ConsistencyProfile,
  type LocationRef,
} from "@/lib/media/videoProject/types";
import { buildLocationPromptContext, parseLocationFromPrompt } from "@/lib/media/videoProject/locationContext";

export type SceneDirectorInput = {
  masterPrompt: string;
  maxScenes?: number;
  location?: LocationRef;
};

export type SceneDirectorResult = {
  scenes: VideoScene[];
  suggestedTitle: string;
  detectedLocation: LocationRef | null;
  consistencyPatch: Partial<ConsistencyProfile>;
};

const FUTURE_CITY_SCENE_TITLES = [
  "Establishing view",
  "Infrastructure and mobility",
  "Daily life and community",
  "Technology in context",
  "Closing perspective",
];

function splitNumberedScenes(prompt: string): string[] | null {
  const lines = prompt
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const numbered = lines.filter((l) => /^(scene\s*)?\d+[\).:\-]/i.test(l));
  if (numbered.length >= 2) {
    return numbered.map((l) => l.replace(/^(scene\s*)?\d+[\).:\-]\s*/i, "").trim());
  }
  return null;
}

function splitBulletScenes(prompt: string): string[] | null {
  const lines = prompt
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => /^[-*•]/.test(l));
  if (lines.length >= 2) {
    return lines.map((l) => l.replace(/^[-*•]\s*/, "").trim());
  }
  return null;
}

function isFutureCityPrompt(prompt: string): boolean {
  return /\b(2050|2060|future|futuristic|smart city|tomorrow)\b/i.test(prompt) && /\b(city|accra|ghana|africa)\b/i.test(prompt);
}

function buildFutureCityScenes(prompt: string, locationCtx: string): string[] {
  const subject = prompt.replace(/\.$/, "").trim();
  return FUTURE_CITY_SCENE_TITLES.map((title, i) => {
    const base = `${title} for ${subject}`;
    if (i === 0) return `${base}. Wide establishing shot with depth and perspective.${locationCtx ? ` ${locationCtx}` : ""}`;
    if (i === 1) return `${base}. Focus on transportation and infrastructure in motion.`;
    if (i === 2) return `${base}. People, culture, and everyday city life.`;
    if (i === 3) return `${base}. Technology integrated naturally into the environment.`;
    return `${base}. Closing cinematic shot with emotional tone and continuity.`;
  });
}

function splitBySentences(prompt: string, maxScenes: number): string[] {
  const sentences = prompt
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  if (sentences.length <= 1) return [prompt.trim()];
  const chunkSize = Math.max(1, Math.ceil(sentences.length / maxScenes));
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    chunks.push(sentences.slice(i, i + chunkSize).join(" "));
  }
  return chunks.slice(0, maxScenes);
}

function sceneTitleFromPrompt(scenePrompt: string, index: number): string {
  const trimmed = scenePrompt.trim();
  if (trimmed.length <= 60) return trimmed || `Scene ${index + 1}`;
  const firstClause = trimmed.split(/[.!?]/)[0]?.trim() ?? trimmed;
  return firstClause.length > 72 ? `${firstClause.slice(0, 69)}…` : firstClause;
}

export function planScenesFromPrompt(input: SceneDirectorInput): SceneDirectorResult {
  const masterPrompt = input.masterPrompt.trim();
  const maxScenes = Math.min(Math.max(input.maxScenes ?? 5, 2), 8);
  const detectedLocation = input.location ?? parseLocationFromPrompt(masterPrompt);
  const locationCtx = detectedLocation ? buildLocationPromptContext(detectedLocation) : "";

  let scenePrompts: string[] =
    splitNumberedScenes(masterPrompt) ??
    splitBulletScenes(masterPrompt) ??
    (isFutureCityPrompt(masterPrompt) ? buildFutureCityScenes(masterPrompt, locationCtx) : null) ??
    splitBySentences(masterPrompt, maxScenes);

  if (scenePrompts.length === 1 && masterPrompt.length > 80) {
    scenePrompts = splitBySentences(masterPrompt, maxScenes);
  }

  if (scenePrompts.length === 0) {
    scenePrompts = [masterPrompt || "Cinematic scene with natural motion and lighting."];
  }

  const scenes: VideoScene[] = scenePrompts.map((prompt, index) => ({
    id: newSceneId(),
    order: index,
    title: sceneTitleFromPrompt(prompt, index),
    prompt: locationCtx && index === 0 && !prompt.includes(locationCtx) ? `${prompt} ${locationCtx}` : prompt,
    locked: false,
    status: "idle",
  }));

  const suggestedTitle =
    masterPrompt.length <= 80
      ? masterPrompt
      : sceneTitleFromPrompt(masterPrompt, 0);

  const consistencyPatch: Partial<ConsistencyProfile> = {};
  if (detectedLocation) {
    consistencyPatch.location = detectedLocation;
    if (detectedLocation.city) {
      consistencyPatch.locations = [
        {
          id: "loc_primary",
          label: detectedLocation.city,
          description: buildLocationPromptContext(detectedLocation),
        },
      ];
    }
  }

  return { scenes, suggestedTitle, detectedLocation, consistencyPatch };
}

export function reorderScenes(scenes: VideoScene[], fromIndex: number, toIndex: number): VideoScene[] {
  const next = [...scenes].sort((a, b) => a.order - b.order);
  if (fromIndex < 0 || fromIndex >= next.length || toIndex < 0 || toIndex >= next.length) {
    return next;
  }
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((s, order) => ({ ...s, order }));
}

export function duplicateScene(scene: VideoScene, order: number): VideoScene {
  return {
    ...scene,
    id: newSceneId(),
    order,
    title: `${scene.title} (copy)`,
    status: "idle",
    jobId: undefined,
    outputUrl: undefined,
    previousOutputUrl: undefined,
    creditsCharged: undefined,
    errorMessage: undefined,
    generationNonce: undefined,
  };
}
