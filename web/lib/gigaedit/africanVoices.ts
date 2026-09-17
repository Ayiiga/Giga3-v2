/**
 * African voice catalog for GigaEdit Audio Studio (browser TTS + Convex voice API).
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
  | "kinyarwanda";

export type VoiceProvider = "elevenlabs" | "openai" | "browser";

export type AfricanVoice = {
  id: string;
  name: string;
  language: string;
  accent: AfricanVoiceAccent;
  region: string;
  flag: string;
  previewText: string;
  provider: VoiceProvider;
  providerVoiceId: string;
  creditCost: number;
  /** BCP-47 lang hint for browser speechSynthesis fallback. */
  lang: string;
  rate?: number;
  pitch?: number;
};

export const AFRICAN_VOICES: AfricanVoice[] = [
  {
    id: "twi_female",
    name: "Ama",
    language: "Twi",
    accent: "twi",
    region: "Ghana",
    flag: "🇬🇭",
    previewText: "Akwaaba! Me din de Ama. Mɛka Twi pɛpɛɛpɛ.",
    provider: "elevenlabs",
    providerVoiceId: "twi_female",
    creditCost: 2,
    lang: "ak-GH",
    rate: 0.98,
    pitch: 1.02,
  },
  {
    id: "hausa_male",
    name: "Ibrahim",
    language: "Hausa",
    accent: "hausa",
    region: "Ghana / Nigeria",
    flag: "🇳🇬",
    previewText: "Sannu! Ni Ibrahim ne. Ina magana da Hausa.",
    provider: "elevenlabs",
    providerVoiceId: "hausa_male",
    creditCost: 2,
    lang: "ha-NG",
    rate: 1,
    pitch: 0.95,
  },
  {
    id: "ga_female",
    name: "Naa",
    language: "Ga",
    accent: "ga",
    region: "Ghana",
    flag: "🇬🇭",
    previewText: "Ojekoo! Mi lɛ Naa. Mi wɔ Ga wiemɔ lɛ.",
    provider: "openai",
    providerVoiceId: "ga_female",
    creditCost: 2,
    lang: "en-GH",
    rate: 0.96,
    pitch: 1.05,
  },
  {
    id: "ewe_male",
    name: "Kofi",
    language: "Ewe",
    accent: "ewe",
    region: "Ghana",
    flag: "🇬🇭",
    previewText: "Woezɔ! Nye ŋkɔ nye Kofi. Metsɔ Eʋegbe.",
    provider: "openai",
    providerVoiceId: "ewe_male",
    creditCost: 2,
    lang: "en-GH",
    rate: 1,
    pitch: 1,
  },
  {
    id: "yoruba_female",
    name: "Adunni",
    language: "Yoruba",
    accent: "yoruba",
    region: "Nigeria",
    flag: "🇳🇬",
    previewText: "Ẹ kú àárọ̀! Orúkọ mi ni Adunni. Mo ń sọ Yorùbá.",
    provider: "elevenlabs",
    providerVoiceId: "yoruba_female",
    creditCost: 2,
    lang: "yo-NG",
    rate: 0.97,
    pitch: 1.08,
  },
  {
    id: "swahili_male",
    name: "Juma",
    language: "Swahili",
    accent: "swahili",
    region: "East Africa",
    flag: "🇰🇪",
    previewText: "Habari! Mimi ni Juma. Ninazungumza Kiswahili.",
    provider: "elevenlabs",
    providerVoiceId: "swahili_male",
    creditCost: 2,
    lang: "sw-KE",
    rate: 1.02,
    pitch: 0.98,
  },
  {
    id: "zulu_female",
    name: "Thandi",
    language: "Zulu",
    accent: "zulu",
    region: "South Africa",
    flag: "🇿🇦",
    previewText: "Sawubona! NginguThandi. Ngikhuluma isiZulu.",
    provider: "openai",
    providerVoiceId: "zulu_female",
    creditCost: 2,
    lang: "zu-ZA",
    rate: 1,
    pitch: 1.04,
  },
  {
    id: "amharic_male",
    name: "Dawit",
    language: "Amharic",
    accent: "amharic",
    region: "Ethiopia",
    flag: "🇪🇹",
    previewText: "ሰላም! እኔ ዳዊት ነኝ። አማርኛ እናገራለሁ።",
    provider: "openai",
    providerVoiceId: "amharic_male",
    creditCost: 3,
    lang: "am-ET",
    rate: 0.94,
    pitch: 0.96,
  },
  {
    id: "kinyarwanda_female",
    name: "Imena",
    language: "Kinyarwanda",
    accent: "kinyarwanda",
    region: "Rwanda",
    flag: "🇷🇼",
    previewText: "Muraho! Nitwa Imena. Mvuga Ikinyarwanda.",
    provider: "elevenlabs",
    providerVoiceId: "kinyarwanda_female",
    creditCost: 2,
    lang: "rw-RW",
    rate: 1,
    pitch: 1.02,
  },
  {
    id: "twi_male",
    name: "Kwame",
    language: "Twi",
    accent: "twi",
    region: "Ghana",
    flag: "🇬🇭",
    previewText: "Maakye! Me din de Kwame. Mɛka Twi ma wo.",
    provider: "browser",
    providerVoiceId: "twi_male",
    creditCost: 0,
    lang: "en-GH",
    rate: 1.05,
    pitch: 0.92,
  },
];

export type VoiceTab = "all" | "african" | "english" | "local";

export function filterVoicesByTab(tab: VoiceTab, voices: AfricanVoice[] = AFRICAN_VOICES): AfricanVoice[] {
  if (tab === "all") return voices;
  if (tab === "african") return voices;
  if (tab === "english") {
    return voices.filter((v) => v.lang.startsWith("en"));
  }
  return voices.filter((v) => v.provider === "browser" || v.creditCost === 0);
}

export function voiceById(id: string): AfricanVoice | undefined {
  return AFRICAN_VOICES.find((v) => v.id === id);
}
