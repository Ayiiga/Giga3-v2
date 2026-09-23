/**
 * Commercial African voice catalog.
 * Production speech is Twi and Ewe through GhanaNLP / Khaya TTS.
 * facebook/mms-tts-aka and facebook/mms-tts-ewe stay off this catalog.
 */

import { VOICE_BACKENDS, type VoiceBackendKind } from "@/lib/voice/africanVoiceTypes";

export type AfricanVoiceRecord = {
  code: string;
  name: string;
  khayaLanguage: string | null;
  modelId: string | null;
  license: "cc-by-nc-4.0" | "khaya-eula" | null;
  hostedInferenceAvailable: boolean;
  commercialProductionEnabled: boolean;
  availability: "development_research_only" | "unverified" | "khaya";
  backends: readonly VoiceBackendKind[];
};

/** ISO codes enabled for commercial speech. Aliases resolve to these codes. */
const COMMERCIAL_LANGUAGES: Record<string, string> = {
  twi: "Asante Twi",
  ewe: "Ewe",
};

const ALIASES: Record<string, string> = {
  tw: "twi",
  aka: "twi",
  ee: "ewe",
};

function khayaRecord(code: string, name: string): AfricanVoiceRecord {
  return {
    code,
    name,
    khayaLanguage: code,
    modelId: "ghananlp-tts-v2",
    license: "khaya-eula",
    hostedInferenceAvailable: false,
    commercialProductionEnabled: true,
    availability: "khaya",
    backends: VOICE_BACKENDS,
  };
}

export const AFRICAN_VOICE_CATALOG: Record<string, AfricanVoiceRecord> = {};

for (const [code, name] of Object.entries(COMMERCIAL_LANGUAGES)) {
  AFRICAN_VOICE_CATALOG[code] = khayaRecord(code, name);
}
for (const [alias, iso] of Object.entries(ALIASES)) {
  const canonical = AFRICAN_VOICE_CATALOG[iso];
  if (!canonical) continue;
  AFRICAN_VOICE_CATALOG[alias] = { ...canonical, code: alias, khayaLanguage: iso };
}

export function lookupAfricanVoice(language: string): AfricanVoiceRecord | null {
  const code = language.trim().toLowerCase();
  return AFRICAN_VOICE_CATALOG[code] ?? null;
}
