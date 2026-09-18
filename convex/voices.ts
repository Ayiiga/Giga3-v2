import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * African voiceover catalog (static — no new table/schema).
 * Mirrors `web/lib/gigaedit/africanVoices.ts` so clients can render
 * offline while TTS synthesis runs through existing AI actions keyed
 * by `voiceId` (ElevenLabs / OpenAI). Additive file: no schema change,
 * no billing change.
 */
export type VoiceRecord = {
  id: string;
  name: string;
  language: string;
  accent: string;
  flag: string;
  previewUrl?: string;
  provider: "elevenlabs" | "openai" | "device";
  creditCostGhs: number;
};

const VOICES: VoiceRecord[] = [
  { id: "twi_female", name: "Ama · Twi", language: "Twi", accent: "Ghana", flag: "🇬🇭", provider: "elevenlabs", creditCostGhs: 0.5 },
  { id: "twi_male", name: "Kwame · Twi", language: "Twi", accent: "Ghana", flag: "🇬🇭", provider: "elevenlabs", creditCostGhs: 0.5 },
  { id: "hausa_female", name: "Aisha · Hausa", language: "Hausa", accent: "Ghana / Nigeria", flag: "🇬🇭", provider: "elevenlabs", creditCostGhs: 0.5 },
  { id: "hausa_male", name: "Musa · Hausa", language: "Hausa", accent: "Ghana / Nigeria", flag: "🇳🇬", provider: "elevenlabs", creditCostGhs: 0.5 },
  { id: "ga_female", name: "Naa · Ga", language: "Ga", accent: "Ghana", flag: "🇬🇭", provider: "openai", creditCostGhs: 0.4 },
  { id: "ewe_male", name: "Kofi · Ewe", language: "Ewe", accent: "Ghana / Togo", flag: "🇬🇭", provider: "openai", creditCostGhs: 0.4 },
  { id: "yoruba_female", name: "Adaeze · Yoruba", language: "Yoruba", accent: "Nigeria", flag: "🇳🇬", provider: "elevenlabs", creditCostGhs: 0.5 },
  { id: "swahili_male", name: "Jabari · Swahili", language: "Swahili", accent: "East Africa", flag: "🇰🇪", provider: "elevenlabs", creditCostGhs: 0.5 },
  { id: "zulu_female", name: "Naledi · Zulu", language: "Zulu", accent: "South Africa", flag: "🇿🇦", provider: "openai", creditCostGhs: 0.4 },
  { id: "amharic_male", name: "Dawit · Amharic", language: "Amharic", accent: "Ethiopia", flag: "🇪🇹", provider: "openai", creditCostGhs: 0.4 },
  { id: "kinyarwanda_female", name: "Keza · Kinyarwanda", language: "Kinyarwanda", accent: "Rwanda", flag: "🇷🇼", provider: "openai", creditCostGhs: 0.4 },
  { id: "en_gh_female", name: "Efua · English (Ghana)", language: "English", accent: "Ghana", flag: "🇬🇭", provider: "elevenlabs", creditCostGhs: 0.3 },
  { id: "en_ng_male", name: "Tunde · English (Nigeria)", language: "English", accent: "Nigeria", flag: "🇳🇬", provider: "elevenlabs", creditCostGhs: 0.3 },
  { id: "device_default", name: "On-device voice", language: "Device", accent: "Offline · free", flag: "📱", provider: "device", creditCostGhs: 0 },
];

export const listVoices = query({
  args: {},
  handler: async () => VOICES,
});

export const getVoice = query({
  args: { voiceId: v.string() },
  handler: async (_ctx, args) => VOICES.find((v) => v.id === args.voiceId) ?? null,
});
