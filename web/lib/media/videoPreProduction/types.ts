export type PreProductionStep =
  | "idea"
  | "script"
  | "voiceover"
  | "visuals"
  | "generate"
  | "preview";

export type PreProductionScene = {
  id: string;
  sceneNumber: number;
  narration: string;
  visualPrompt: string;
  optionalImageUrl?: string;
  durationSec?: number;
};

export type VoiceoverSettings = {
  voiceUri: string;
  voiceName: string;
  lang: string;
  rate: number;
  pitch: number;
};

export type VideoPreProductionDraft = {
  version: 1;
  updatedAt: number;
  step: PreProductionStep;
  idea: string;
  originalScript: string;
  workingScript: string;
  improvedScript: string;
  scriptApproved: boolean;
  voiceover: VoiceoverSettings;
  voiceoverApproved: boolean;
  scenes: PreProductionScene[];
  optionalImageUrls: string[];
  videoCategory: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  durationSec: 5 | 10 | 15;
  quality: "720p" | "1080p";
  lastJobId?: string;
};

export const DEFAULT_VOICEOVER: VoiceoverSettings = {
  voiceUri: "",
  voiceName: "Default",
  lang: "en",
  rate: 1,
  pitch: 1,
};

export function createEmptyDraft(): VideoPreProductionDraft {
  return {
    version: 1,
    updatedAt: Date.now(),
    step: "idea",
    idea: "",
    originalScript: "",
    workingScript: "",
    improvedScript: "",
    scriptApproved: false,
    voiceover: DEFAULT_VOICEOVER,
    voiceoverApproved: false,
    scenes: [],
    optionalImageUrls: [],
    videoCategory: "cinematic_trailers",
    aspectRatio: "9:16",
    durationSec: 10,
    quality: "720p",
  };
}
