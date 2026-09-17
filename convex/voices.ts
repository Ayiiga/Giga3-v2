/**
 * African voice catalog for GigaEdit voiceovers.
 * Seed data is served from this module; production can migrate rows into `voices` table later.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

export const voiceRecordValidator = v.object({
  id: v.string(),
  name: v.string(),
  language: v.string(),
  accent: v.string(),
  region: v.string(),
  flag: v.string(),
  previewText: v.string(),
  provider: v.union(v.literal("elevenlabs"), v.literal("openai"), v.literal("browser")),
  providerVoiceId: v.string(),
  creditCost: v.number(),
  lang: v.string(),
});

/** Static seed — 10 African voices (Twi, Hausa, Ga, Ewe, Yoruba, Swahili, Zulu, Amharic, Kinyarwanda). */
const AFRICAN_VOICE_SEED = [
  {
    id: "twi_female",
    name: "Ama",
    language: "Twi",
    accent: "twi",
    region: "Ghana",
    flag: "🇬🇭",
    previewText: "Akwaaba! Me din de Ama. Mɛka Twi pɛpɛɛpɛ.",
    provider: "elevenlabs" as const,
    providerVoiceId: "twi_female",
    creditCost: 2,
    lang: "ak-GH",
  },
  {
    id: "hausa_male",
    name: "Ibrahim",
    language: "Hausa",
    accent: "hausa",
    region: "Ghana / Nigeria",
    flag: "🇳🇬",
    previewText: "Sannu! Ni Ibrahim ne. Ina magana da Hausa.",
    provider: "elevenlabs" as const,
    providerVoiceId: "hausa_male",
    creditCost: 2,
    lang: "ha-NG",
  },
  {
    id: "ga_female",
    name: "Naa",
    language: "Ga",
    accent: "ga",
    region: "Ghana",
    flag: "🇬🇭",
    previewText: "Ojekoo! Mi lɛ Naa. Mi wɔ Ga wiemɔ lɛ.",
    provider: "openai" as const,
    providerVoiceId: "ga_female",
    creditCost: 2,
    lang: "en-GH",
  },
  {
    id: "ewe_male",
    name: "Kofi",
    language: "Ewe",
    accent: "ewe",
    region: "Ghana",
    flag: "🇬🇭",
    previewText: "Woezɔ! Nye ŋkɔ nye Kofi. Metsɔ Eʋegbe.",
    provider: "openai" as const,
    providerVoiceId: "ewe_male",
    creditCost: 2,
    lang: "en-GH",
  },
  {
    id: "yoruba_female",
    name: "Adunni",
    language: "Yoruba",
    accent: "yoruba",
    region: "Nigeria",
    flag: "🇳🇬",
    previewText: "Ẹ kú àárọ̀! Orúkọ mi ni Adunni. Mo ń sọ Yorùbá.",
    provider: "elevenlabs" as const,
    providerVoiceId: "yoruba_female",
    creditCost: 2,
    lang: "yo-NG",
  },
  {
    id: "swahili_male",
    name: "Juma",
    language: "Swahili",
    accent: "swahili",
    region: "East Africa",
    flag: "🇰🇪",
    previewText: "Habari! Mimi ni Juma. Ninazungumza Kiswahili.",
    provider: "elevenlabs" as const,
    providerVoiceId: "swahili_male",
    creditCost: 2,
    lang: "sw-KE",
  },
  {
    id: "zulu_female",
    name: "Thandi",
    language: "Zulu",
    accent: "zulu",
    region: "South Africa",
    flag: "🇿🇦",
    previewText: "Sawubona! NginguThandi. Ngikhuluma isiZulu.",
    provider: "openai" as const,
    providerVoiceId: "zulu_female",
    creditCost: 2,
    lang: "zu-ZA",
  },
  {
    id: "amharic_male",
    name: "Dawit",
    language: "Amharic",
    accent: "amharic",
    region: "Ethiopia",
    flag: "🇪🇹",
    previewText: "ሰላም! እኔ ዳዊት ነኝ። አማርኛ እናገራለሁ።",
    provider: "openai" as const,
    providerVoiceId: "amharic_male",
    creditCost: 3,
    lang: "am-ET",
  },
  {
    id: "kinyarwanda_female",
    name: "Imena",
    language: "Kinyarwanda",
    accent: "kinyarwanda",
    region: "Rwanda",
    flag: "🇷🇼",
    previewText: "Muraho! Nitwa Imena. Mvuga Ikinyarwanda.",
    provider: "elevenlabs" as const,
    providerVoiceId: "kinyarwanda_female",
    creditCost: 2,
    lang: "rw-RW",
  },
  {
    id: "twi_male",
    name: "Kwame",
    language: "Twi",
    accent: "twi",
    region: "Ghana",
    flag: "🇬🇭",
    previewText: "Maakye! Me din de Kwame. Mɛka Twi ma wo.",
    provider: "browser" as const,
    providerVoiceId: "twi_male",
    creditCost: 0,
    lang: "en-GH",
  },
];

/** Public catalog for GigaEdit African voice picker. */
export const listAfricanVoices = query({
  args: {
    accent: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    if (args.accent) {
      return AFRICAN_VOICE_SEED.filter((row) => row.accent === args.accent);
    }
    return AFRICAN_VOICE_SEED;
  },
});

export const getVoiceById = query({
  args: { id: v.string() },
  handler: async (_ctx, args) => {
    return AFRICAN_VOICE_SEED.find((row) => row.id === args.id) ?? null;
  },
});
