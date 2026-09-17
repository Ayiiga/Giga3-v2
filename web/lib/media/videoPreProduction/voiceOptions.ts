import type { BrowserVoiceOption } from "@/lib/media/videoPreProduction/browserVoiceover";

export type VoiceStylePreset = {
  id: string;
  label: string;
  rate: number;
  pitch: number;
};

export const VOICE_STYLE_PRESETS: VoiceStylePreset[] = [
  { id: "natural", label: "Natural", rate: 1, pitch: 1 },
  { id: "warm", label: "Warm & calm", rate: 0.92, pitch: 0.95 },
  { id: "energetic", label: "Energetic", rate: 1.12, pitch: 1.05 },
  { id: "news", label: "News / clear", rate: 1.05, pitch: 1 },
];

export function languageCodeFromVoice(voice: BrowserVoiceOption): string {
  const lang = voice.lang?.trim() || "en";
  return lang.split("-")[0].toLowerCase();
}

export function listVoiceLanguages(voices: BrowserVoiceOption[]): string[] {
  const codes = new Set<string>();
  for (const voice of voices) {
    codes.add(languageCodeFromVoice(voice));
  }
  return Array.from(codes).sort((a, b) => {
    if (a === "en") return -1;
    if (b === "en") return 1;
    return a.localeCompare(b);
  });
}

export function filterVoicesByLanguage(
  voices: BrowserVoiceOption[],
  langCode: string
): BrowserVoiceOption[] {
  const code = langCode.toLowerCase();
  const filtered = voices.filter((v) => languageCodeFromVoice(v) === code);
  return filtered.length ? filtered : voices;
}

export function languageLabel(code: string): string {
  const labels: Record<string, string> = {
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
    pt: "Portuguese",
    ar: "Arabic",
    hi: "Hindi",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    sw: "Swahili",
  };
  return labels[code.toLowerCase()] ?? code.toUpperCase();
}
