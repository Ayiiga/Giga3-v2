/**
 * GhanaNLP / Khaya language codes from the published v2 TTS and translation specs.
 * Legacy codes such as `tw` and `ee` are accepted at the Giga3 edge and sent as ISO 639-3.
 * English speech stays on the device voice, so `eng` is not a TTS target.
 */

export const KHAYA_TTS_LANGUAGES: Record<string, string> = {
  ada: "Dangme",
  atw: "Akuapem Twi",
  twi: "Asante Twi",
  dag: "Dagbani",
  dga: "Dagaare",
  ewe: "Ewe",
  fat: "Fante",
  fra: "French",
  gaa: "Ga",
  gjn: "Gonja",
  gur: "Gurene",
  hau: "Hausa",
  ibo: "Igbo",
  xsm: "Kasem",
  kik: "Kikuyu",
  xon: "Konkomba (Likpakpaanl)",
  lxn: "Konkomba (Likoonli)",
  kri: "Krio",
  kus: "Kusaal",
  luo: "Luo",
  maw: "Mampruli",
  men: "Mende",
  mer: "Meru/Kimeru",
  nzi: "Nzema",
  pcm: "Pidgin",
  sna: "Shona",
  swa: "Swahili",
  tem: "Temne",
  wlx: "Wali",
  wol: "Wolof",
  yor: "Yoruba",
};

/** Codes listed on the Khaya translation v2 schema. Hausa is TTS-only there. */
export const KHAYA_TRANSLATION_LANGUAGES: Record<string, string> = {
  eng: "English",
  twi: "Twi",
  ewe: "Ewe",
  gaa: "Ga",
  fat: "Fante",
  yor: "Yoruba",
  dag: "Dagbani",
  kik: "Kikuyu",
  gur: "Gurene",
  luo: "Luo",
  mer: "Kimeru",
  kus: "Kusaal",
};

const TTS_ALIASES: Record<string, string> = {
  tw: "twi",
  aka: "twi",
  ee: "ewe",
  ha: "hau",
  yo: "yor",
  sw: "swa",
  ki: "kik",
};

const TRANSLATION_ALIASES: Record<string, string> = {
  en: "eng",
  tw: "twi",
  aka: "twi",
  ee: "ewe",
  yo: "yor",
  ki: "kik",
  sw: "swa",
};

export type KhayaSpeakerId = "male_low" | "male_high" | "female";

const MALE_LOW_VOICES = new Set([
  "kwame-twi",
  "musa-hausa",
  "kofi-ewe",
  "tunde-yoruba",
  "jabari-swahili",
]);

/** Commercial speech is Twi and Ewe only. Other Khaya codes stay unsupported here. */
const COMMERCIAL_KHAYA_TTS: Record<string, "twi" | "ewe"> = {
  tw: "twi",
  twi: "twi",
  aka: "twi",
  ee: "ewe",
  ewe: "ewe",
};

export function resolveCommercialKhayaTtsLanguage(language: string): "twi" | "ewe" | null {
  const code = language.trim().toLowerCase();
  return COMMERCIAL_KHAYA_TTS[code] ?? null;
}

export function resolveKhayaTtsLanguage(language: string): string | null {
  const code = language.trim().toLowerCase();
  if (code === "en" || code === "eng" || code.startsWith("en-")) return null;
  const iso = TTS_ALIASES[code] ?? code;
  return KHAYA_TTS_LANGUAGES[iso] ? iso : null;
}

export function resolveKhayaTranslationLanguage(language: string): string | null {
  const code = language.trim().toLowerCase();
  const iso = TRANSLATION_ALIASES[code] ?? code;
  return KHAYA_TRANSLATION_LANGUAGES[iso] ? iso : null;
}

export function resolveKhayaSpeaker(voice: string | undefined): KhayaSpeakerId {
  const value = voice?.trim().toLowerCase() ?? "";
  if (value === "male_low" || value === "male_high" || value === "female") return value;
  if (value.includes("high")) return "male_high";
  if (MALE_LOW_VOICES.has(value) || value.includes("male")) return "male_low";
  return "female";
}

export function khayaSpeechForProfile(voiceId: string | undefined): { language: string; speaker: KhayaSpeakerId } | null {
  const id = voiceId?.trim().toLowerCase() ?? "";
  const profiles: Record<string, "twi" | "ewe"> = {
    "abena-twi": "twi",
    "kwame-twi": "twi",
    "kofi-ewe": "ewe",
  };
  const language = profiles[id];
  if (!language) return null;
  return { language, speaker: resolveKhayaSpeaker(id) };
}
