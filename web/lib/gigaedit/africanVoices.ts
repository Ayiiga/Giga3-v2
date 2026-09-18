/**
 * African voiceover catalog for GigaEdits Audio Studio.
 * Client-side static catalog (works offline); mirrors `convex/voices.ts`.
 * TTS synthesis itself runs through Convex actions (ElevenLabs / OpenAI),
 * keyed by `voiceId` — no new backend schema required.
 */

export type AfricanVoiceRegion = "African" | "English" | "Local";

export type AfricanVoice = {
  /** Stable TTS voice id, e.g. `twi_female`. Stored in Convex `api/voices`. */
  id: string;
  name: string;
  language: string;
  region: string;
  flag: string;
  /** Grouping tab in Audio Studio. */
  group: AfricanVoiceRegion;
  /** Short preview clip (data URL or remote mp3). Empty = Web Speech preview. */
  previewUrl?: string;
  provider: "elevenlabs" | "openai" | "device";
  /** Playback-only cost hint in GH₵ (device voices are free/offline). */
  creditCostGhs: number;
  africanAccent: boolean;
};

export const AFRICAN_VOICES: AfricanVoice[] = [
  { id: "twi_female", name: "Ama · Twi", language: "Twi", region: "Ghana", flag: "🇬🇭", group: "African", provider: "elevenlabs", creditCostGhs: 0.5, africanAccent: true },
  { id: "twi_male", name: "Kwame · Twi", language: "Twi", region: "Ghana", flag: "🇬🇭", group: "African", provider: "elevenlabs", creditCostGhs: 0.5, africanAccent: true },
  { id: "hausa_female", name: "Aisha · Hausa", language: "Hausa", region: "Ghana / Nigeria", flag: "🇬🇭", group: "African", provider: "elevenlabs", creditCostGhs: 0.5, africanAccent: true },
  { id: "hausa_male", name: "Musa · Hausa", language: "Hausa", region: "Ghana / Nigeria", flag: "🇳🇬", group: "African", provider: "elevenlabs", creditCostGhs: 0.5, africanAccent: true },
  { id: "ga_female", name: "Naa · Ga", language: "Ga", region: "Ghana", flag: "🇬🇭", group: "Local", provider: "openai", creditCostGhs: 0.4, africanAccent: true },
  { id: "ewe_male", name: "Kofi · Ewe", language: "Ewe", region: "Ghana / Togo", flag: "🇬🇭", group: "Local", provider: "openai", creditCostGhs: 0.4, africanAccent: true },
  { id: "yoruba_female", name: "Adaeze · Yoruba", language: "Yoruba", region: "Nigeria", flag: "🇳🇬", group: "African", provider: "elevenlabs", creditCostGhs: 0.5, africanAccent: true },
  { id: "swahili_male", name: "Jabari · Swahili", language: "Swahili", region: "East Africa", flag: "🇰🇪", group: "African", provider: "elevenlabs", creditCostGhs: 0.5, africanAccent: true },
  { id: "zulu_female", name: "Naledi · Zulu", language: "Zulu", region: "South Africa", flag: "🇿🇦", group: "African", provider: "openai", creditCostGhs: 0.4, africanAccent: true },
  { id: "amharic_male", name: "Dawit · Amharic", language: "Amharic", region: "Ethiopia", flag: "🇪🇹", group: "African", provider: "openai", creditCostGhs: 0.4, africanAccent: true },
  { id: "kinyarwanda_female", name: "Keza · Kinyarwanda", language: "Kinyarwanda", region: "Rwanda", flag: "🇷🇼", group: "African", provider: "openai", creditCostGhs: 0.4, africanAccent: true },
  { id: "en_gh_female", name: "Efua · English (Ghana)", language: "English", region: "Ghana", flag: "🇬🇭", group: "English", provider: "elevenlabs", creditCostGhs: 0.3, africanAccent: true },
  { id: "en_ng_male", name: "Tunde · English (Nigeria)", language: "English", region: "Nigeria", flag: "🇳🇬", group: "English", provider: "elevenlabs", creditCostGhs: 0.3, africanAccent: true },
  { id: "device_default", name: "On-device voice", language: "Device", region: "Offline · free", flag: "📱", group: "Local", provider: "device", creditCostGhs: 0, africanAccent: false },
];

export type AfricanVoiceTab = "All" | "African" | "English" | "Local";

export const AFRICAN_VOICE_TABS: AfricanVoiceTab[] = ["All", "African", "English", "Local"];

export function voicesForTab(tab: AfricanVoiceTab): AfricanVoice[] {
  if (tab === "All") return AFRICAN_VOICES;
  return AFRICAN_VOICES.filter((v) => v.group === tab);
}

export function getAfricanVoice(id: string | null | undefined): AfricanVoice | null {
  if (!id) return null;
  return AFRICAN_VOICES.find((v) => v.id === id) ?? null;
}

/** Speak a short preview offline via the Web Speech API (no credits). */
export function previewAfricanVoiceOffline(voice: AfricanVoice, text?: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(
      text?.trim() || `Hello! This is ${voice.name}, speaking ${voice.language}. Built in Africa, for Africa.`
    );
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  } catch {
    /* ignore — preview is best-effort on low-end devices */
  }
}
