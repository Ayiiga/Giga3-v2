import type { PreProductionScene } from "@/lib/media/videoPreProduction/types";

const WORDS_PER_SECOND = 2.5;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateSpeechDurationSec(text: string): number {
  const words = countWords(text);
  return Math.max(5, Math.round(words / WORDS_PER_SECOND));
}

/** Extract bracketed visual directions from script lines. */
export function splitScriptIntoScenes(script: string, maxScenes = 8): PreProductionScene[] {
  const lines = script
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sceneLines = lines.filter((l) =>
    /^(scene\s*)?\d+[\).:\-—]/i.test(l) || /^[-*•]/.test(l)
  );

  const chunks =
    sceneLines.length >= 2
      ? sceneLines.map((l) => l.replace(/^(scene\s*)?\d+[\).:\-—]\s*/i, "").replace(/^[-*•]\s*/, ""))
      : script
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 20)
          .slice(0, maxScenes);

  if (chunks.length === 0 && script.trim()) {
    chunks.push(script.trim());
  }

  return chunks.slice(0, maxScenes).map((chunk, index) => {
    const visualMatch = chunk.match(/\[([^\]]+)\]/);
    const visualPrompt = visualMatch?.[1]?.trim() || chunk.slice(0, 120);
    const narration = chunk.replace(/\[[^\]]+\]/g, "").trim() || chunk;
    return {
      id: `scene_${index + 1}`,
      sceneNumber: index + 1,
      narration,
      visualPrompt,
      durationSec: estimateSpeechDurationSec(narration),
    };
  });
}

export function sceneVisualSummary(scenes: PreProductionScene[]): string {
  return scenes
    .map((s) => `Scene ${s.sceneNumber}: [${s.visualPrompt}] ${s.narration}`)
    .join("\n");
}
