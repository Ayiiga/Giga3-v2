/**
 * African voiceover catalog for GigaEdits Audio Studio.
 * Works offline in the client; Convex mirrors the same seed catalog.
 */

export type AfricanVoiceAccent =
  | "twi"
  | "hausa"
  | "ga"
  | "ewe"
  | "yoruba"
  | "swahili"
  | "zulu"
  | "amharic"
  | "kinyarwanda"
  | "english"
  | "device";

export type AfricanVoiceRegion = "African" | "English" | "Local";
export type VoiceProvider = "elevenlabs" | "openai" | "browser" | "device";

export type AfricanVoice = {
  id: string;
  name: string;
  language: string;
  accent: AfricanVoiceAccent;
  region: string;
  flag: string;
  group: AfricanVoiceRegion;
  previewText: string;
  previewUrl?: string;
  provider: VoiceProvider;
  providerVoiceId: string;
  creditCost: number;
  creditCostGhs: number;
  africanAccent: boolean;
  /** BCP-47 hint for browser preview fallback. */
  lang: string;
  rate?: number;
  pitch?: number;
};

export const AFRICAN_VOICES: AfricanVoice[] = [
  {
    id: "twi_female",
    name: "Ama · Twi",
    language: "Twi",
    accent: "twi",
    region: "Ghana",
    flag: "🇬🇭",
    group: "African",
    previewText: "Akwaaba! Me din de Ama. Mɛka Twi pɛpɛɛpɛ.",
    provider: "elevenlabs",
    providerVoiceId: "twi_female",
    creditCost: 2,
    creditCostGhs: 0.5,
    africanAccent: true,
    lang: "ak-GH",
    rate: 0.98,
    pitch: 1.02,
  },
  {
    id: "twi_male",
    name: "Kwame · Twi",
    language: "Twi",
    accent: "twi",
    region: "Ghana",
    flag: "🇬🇭",
    group: "African",
    previewText: "Maakye! Me din de Kwame. Mɛka Twi ma wo.",
    provider: "browser",
    providerVoiceId: "twi_male",
    creditCost: 0,
    creditCostGhs: 0,
    africanAccent: true,
    lang: "en-GH",
    rate: 1.05,
    pitch: 0.92,
  },
  {
    id: "hausa_female",
    name: "Aisha · Hausa",
    language: "Hausa",
    accent: "hausa",
    region: "Ghana / Nigeria",
    flag: "🇬🇭",
    group: "African",
    previewText: "Sannu! Ni Aisha ce. Ina magana da Hausa cikin salo mai dumi.",
    provider: "elevenlabs",
    providerVoiceId: "hausa_female",
    creditCost: 2,
    creditCostGhs: 0.5,
    africanAccent: true,
    lang: "ha-GH",
    rate: 1,
    pitch: 1.02,
  },
  {
    id: "hausa_male",
    name: "Ibrahim · Hausa",
    language: "Hausa",
    accent: "hausa",
    region: "Ghana / Nigeria",
    flag: "🇳🇬",
    group: "African",
    previewText: "Sannu! Ni Ibrahim ne. Ina magana da Hausa.",
    provider: "elevenlabs",
    providerVoiceId: "hausa_male",
    creditCost: 2,
    creditCostGhs: 0.5,
    africanAccent: true,
    lang: "ha-NG",
    rate: 1,
    pitch: 0.95,
  },
  {
    id: "ga_female",
    name: "Naa · Ga",
    language: "Ga",
    accent: "ga",
    region: "Ghana",
    flag: "🇬🇭",
    group: "Local",
    previewText: "Ojekoo! Mi lɛ Naa. Mi wɔ Ga wiemɔ lɛ.",
    provider: "openai",
    providerVoiceId: "ga_female",
    creditCost: 2,
    creditCostGhs: 0.4,
    africanAccent: true,
    lang: "en-GH",
    rate: 0.96,
    pitch: 1.05,
  },
  {
    id: "ewe_male",
    name: "Kofi · Ewe",
    language: "Ewe",
    accent: "ewe",
    region: "Ghana / Togo",
    flag: "🇬🇭",
    group: "Local",
    previewText: "Woezɔ! Nye ŋkɔ nye Kofi. Metsɔ Eʋegbe.",
    provider: "openai",
    providerVoiceId: "ewe_male",
    creditCost: 2,
    creditCostGhs: 0.4,
    africanAccent: true,
    lang: "en-GH",
    rate: 1,
    pitch: 1,
  },
  {
    id: "yoruba_female",
    name: "Adunni · Yoruba",
    language: "Yoruba",
    accent: "yoruba",
    region: "Nigeria",
    flag: "🇳🇬",
    group: "African",
    previewText: "Ẹ kú àárọ̀! Orúkọ mi ni Adunni. Mo ń sọ Yorùbá.",
    provider: "elevenlabs",
    providerVoiceId: "yoruba_female",
    creditCost: 2,
    creditCostGhs: 0.5,
    africanAccent: true,
    lang: "yo-NG",
    rate: 0.97,
    pitch: 1.08,
  },
  {
    id: "swahili_male",
    name: "Juma · Swahili",
    language: "Swahili",
    accent: "swahili",
    region: "East Africa",
    flag: "🇰🇪",
    group: "African",
    previewText: "Habari! Mimi ni Juma. Ninazungumza Kiswahili.",
    provider: "elevenlabs",
    providerVoiceId: "swahili_male",
    creditCost: 2,
    creditCostGhs: 0.5,
    africanAccent: true,
    lang: "sw-KE",
    rate: 1.02,
    pitch: 0.98,
  },
  {
    id: "zulu_female",
    name: "Thandi · Zulu",
    language: "Zulu",
    accent: "zulu",
    region: "South Africa",
    flag: "🇿🇦",
    group: "African",
    previewText: "Sawubona! NginguThandi. Ngikhuluma isiZulu.",
    provider: "openai",
    providerVoiceId: "zulu_female",
    creditCost: 2,
    creditCostGhs: 0.4,
    africanAccent: true,
    lang: "zu-ZA",
    rate: 1,
    pitch: 1.04,
  },
  {
    id: "amharic_male",
    name: "Dawit · Amharic",
    language: "Amharic",
    accent: "amharic",
    region: "Ethiopia",
    flag: "🇪🇹",
    group: "African",
    previewText: "ሰላም! እኔ ዳዊት ነኝ። አማርኛ እናገራለሁ።",
    provider: "openai",
    providerVoiceId: "amharic_male",
    creditCost: 3,
    creditCostGhs: 0.4,
    africanAccent: true,
    lang: "am-ET",
    rate: 0.94,
    pitch: 0.96,
  },
  {
    id: "kinyarwanda_female",
    name: "Imena · Kinyarwanda",
    language: "Kinyarwanda",
    accent: "kinyarwanda",
    region: "Rwanda",
    flag: "🇷🇼",
    group: "African",
    previewText: "Muraho! Nitwa Imena. Mvuga Ikinyarwanda.",
    provider: "elevenlabs",
    providerVoiceId: "kinyarwanda_female",
    creditCost: 2,
    creditCostGhs: 0.4,
    africanAccent: true,
    lang: "rw-RW",
    rate: 1,
    pitch: 1.02,
  },
  {
    id: "en_gh_female",
    name: "Efua · English (Ghana)",
    language: "English",
    accent: "english",
    region: "Ghana",
    flag: "🇬🇭",
    group: "English",
    previewText: "Hello! I am Efua, speaking English with a Ghanaian accent.",
    provider: "elevenlabs",
    providerVoiceId: "en_gh_female",
    creditCost: 1,
    creditCostGhs: 0.3,
    africanAccent: true,
    lang: "en-GH",
    rate: 1,
    pitch: 1,
  },
  {
    id: "en_ng_male",
    name: "Tunde · English (Nigeria)",
    language: "English",
    accent: "english",
    region: "Nigeria",
    flag: "🇳🇬",
    group: "English",
    previewText: "Hello! I am Tunde, speaking English with a Nigerian accent.",
    provider: "elevenlabs",
    providerVoiceId: "en_ng_male",
    creditCost: 1,
    creditCostGhs: 0.3,
    africanAccent: true,
    lang: "en-NG",
    rate: 1,
    pitch: 0.98,
  },
  {
    id: "device_default",
    name: "On-device voice",
    language: "Device",
    accent: "device",
    region: "Offline · free",
    flag: "📱",
    group: "Local",
    previewText: "Hello! This is your on-device voice preview.",
    provider: "device",
    providerVoiceId: "device_default",
    creditCost: 0,
    creditCostGhs: 0,
    africanAccent: false,
    lang: "en",
    rate: 1,
    pitch: 1,
  },
];

export type VoiceTab = "all" | "african" | "english" | "local";
export type AfricanVoiceTab = "All" | "African" | "English" | "Local";

export const AFRICAN_VOICE_TABS: AfricanVoiceTab[] = ["All", "African", "English", "Local"];

export function voicesForTab(tab: AfricanVoiceTab, voices: AfricanVoice[] = AFRICAN_VOICES): AfricanVoice[] {
  if (tab === "All") return voices;
  return voices.filter((voice) => voice.group === tab);
}

export function filterVoicesByTab(tab: VoiceTab, voices: AfricanVoice[] = AFRICAN_VOICES): AfricanVoice[] {
  if (tab === "all") return voices;
  if (tab === "african") return voices.filter((voice) => voice.group === "African");
  if (tab === "english") return voices.filter((voice) => voice.group === "English");
  return voices.filter((voice) => voice.group === "Local");
}

export function getAfricanVoice(id: string | null | undefined): AfricanVoice | null {
  if (!id) return null;
  return AFRICAN_VOICES.find((voice) => voice.id === id) ?? null;
}

export function voiceById(id: string): AfricanVoice | undefined {
  return AFRICAN_VOICES.find((voice) => voice.id === id);
}

/** Speak a short preview locally via the Web Speech API (no credits). */
export function previewAfricanVoiceOffline(voice: AfricanVoice, text?: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      text?.trim() || voice.previewText || `Hello! This is ${voice.name}, speaking ${voice.language}.`
    );
    utterance.lang = voice.lang || "en";
    utterance.rate = voice.rate ?? 1;
    utterance.pitch = voice.pitch ?? 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* ignore — preview is best-effort on low-end devices */
  }
}
