import type { PreProductionScene, VoiceoverSettings } from "@/lib/media/videoPreProduction/types";
import { sceneVisualSummary } from "@/lib/media/videoPreProduction/scriptUtils";

export function buildPreProductionVideoPrompt(args: {
  approvedScript: string;
  scenes: PreProductionScene[];
  voiceover: VoiceoverSettings;
}): string {
  const voiceLabel = args.voiceover.voiceName || "natural narrator";
  const scenes = sceneVisualSummary(args.scenes);
  return [
    "Create a cinematic short video that follows this approved narration script.",
    `Narration (${voiceLabel}):`,
    args.approvedScript.trim(),
    scenes ? `Visual scene plan:\n${scenes}` : "",
    "Sync motion and visuals to the narration. Smooth pacing, coherent story, no on-screen gibberish text.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
