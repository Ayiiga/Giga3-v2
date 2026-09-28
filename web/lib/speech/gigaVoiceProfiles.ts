import type { VoiceLangConfig } from "@/lib/speech/matchBrowserVoice";

export type GigaVoiceProfile = {
  id: string;
  name: string;
  flag: string;
  lang: string;
};

/**
 * BCP-47 tags. African profiles list only that language.
 * English is the playback stand-in when no native voice is installed,
 * and the utterance keeps the English voice's own lang tag.
 */
export const GIGA_VOICE_LANG: Record<string, VoiceLangConfig> = {
  "english-british": { primary: "en-GB", fallbacks: ["en-US", "en-GH", "en"] },
  english: { primary: "en-GB", fallbacks: ["en-US", "en-GH", "en"] },
  "abena-twi": { primary: "ak-GH", fallbacks: ["ak", "tw-GH", "tw"] },
  "kwame-twi": { primary: "ak-GH", fallbacks: ["ak", "tw-GH", "tw"] },
  "aisha-hausa": { primary: "ha-NG", fallbacks: ["ha", "ha-GH"] },
  "musa-hausa": { primary: "ha-NG", fallbacks: ["ha", "ha-GH"] },
  "naa-ga": { primary: "gaa-GH", fallbacks: ["gaa"] },
  "kofi-ewe": { primary: "ee-GH", fallbacks: ["ee"] },
  "adaeze-yoruba": { primary: "yo-NG", fallbacks: ["yo", "yo-GH"] },
  "tunde-yoruba": { primary: "yo-NG", fallbacks: ["yo", "yo-GH"] },
  "zawadi-swahili": { primary: "sw-KE", fallbacks: ["sw", "sw-TZ"] },
  "jabari-swahili": { primary: "sw-KE", fallbacks: ["sw", "sw-TZ"] },
  /** GigaLearn alias ids */
  "ade-yoruba": { primary: "yo-NG", fallbacks: ["yo", "yo-GH"] },
};

export const GIGA_CHAT_VOICES: GigaVoiceProfile[] = [
  { id: "english-british", name: "English (British)", flag: "🇬🇧", lang: "en-GB" },
  { id: "abena-twi", name: "Abena · Twi (F)", flag: "🇬🇭", lang: "ak-GH" },
  { id: "kwame-twi", name: "Kwame · Twi (M)", flag: "🇬🇭", lang: "ak-GH" },
  { id: "aisha-hausa", name: "Aisha · Hausa (F)", flag: "🇳🇬", lang: "ha-NG" },
  { id: "musa-hausa", name: "Musa · Hausa (M)", flag: "🇳🇬", lang: "ha-NG" },
  { id: "naa-ga", name: "Naa · Ga (F)", flag: "🇬🇭", lang: "gaa-GH" },
  { id: "kofi-ewe", name: "Kofi · Ewe (M)", flag: "🇬🇭", lang: "ee-GH" },
  { id: "adaeze-yoruba", name: "Adaeze · Yoruba (F)", flag: "🇳🇬", lang: "yo-NG" },
  { id: "tunde-yoruba", name: "Tunde · Yoruba (M)", flag: "🇳🇬", lang: "yo-NG" },
  { id: "zawadi-swahili", name: "Zawadi · Swahili (F)", flag: "🇰🇪", lang: "sw-KE" },
  { id: "jabari-swahili", name: "Jabari · Swahili (M)", flag: "🇰🇪", lang: "sw-KE" },
];
