/**
 * African TTS routing catalog.
 *
 * Verified 2026-09-23 against the Hugging Face Hub API:
 * - https://huggingface.co/api/models/facebook/mms-tts-aka?expand[]=inferenceProviderMapping
 * - https://huggingface.co/api/models/facebook/mms-tts-ewe?expand[]=inferenceProviderMapping
 * Both responses had an empty `inferenceProviderMapping`. The model cards
 * license each checkpoint as CC-BY-NC 4.0 and document local Transformers
 * inference only. Neither checkpoint is enabled for Giga3 commercial production.
 *
 * Ga, Dagbani, Hausa, Yoruba, and Fante are reserved codes only.
 */

import { VOICE_BACKENDS, type VoiceBackendKind } from "@/lib/voice/africanVoiceTypes";

export type RoutedLanguageCode = "tw" | "ee";
export type PlannedLanguageCode = "gaa" | "dag" | "ha" | "yo" | "fat";
export type AfricanLanguageCode = RoutedLanguageCode | PlannedLanguageCode;

export type AfricanVoiceRecord = {
  code: AfricanLanguageCode;
  name: string;
  modelId: string | null;
  license: "cc-by-nc-4.0" | null;
  hostedInferenceAvailable: boolean;
  commercialProductionEnabled: boolean;
  availability: "development_research_only" | "unverified";
  backends: readonly VoiceBackendKind[];
};

export const AFRICAN_VOICE_CATALOG: Record<AfricanLanguageCode, AfricanVoiceRecord> = {
  tw: {
    code: "tw",
    name: "Akan/Twi",
    modelId: "facebook/mms-tts-aka",
    license: "cc-by-nc-4.0",
    hostedInferenceAvailable: false,
    commercialProductionEnabled: false,
    availability: "development_research_only",
    backends: VOICE_BACKENDS,
  },
  ee: {
    code: "ee",
    name: "Ewe",
    modelId: "facebook/mms-tts-ewe",
    license: "cc-by-nc-4.0",
    hostedInferenceAvailable: false,
    commercialProductionEnabled: false,
    availability: "development_research_only",
    backends: VOICE_BACKENDS,
  },
  gaa: {
    code: "gaa",
    name: "Ga",
    modelId: null,
    license: null,
    hostedInferenceAvailable: false,
    commercialProductionEnabled: false,
    availability: "unverified",
    backends: VOICE_BACKENDS,
  },
  dag: {
    code: "dag",
    name: "Dagbani",
    modelId: null,
    license: null,
    hostedInferenceAvailable: false,
    commercialProductionEnabled: false,
    availability: "unverified",
    backends: VOICE_BACKENDS,
  },
  ha: {
    code: "ha",
    name: "Hausa",
    modelId: null,
    license: null,
    hostedInferenceAvailable: false,
    commercialProductionEnabled: false,
    availability: "unverified",
    backends: VOICE_BACKENDS,
  },
  yo: {
    code: "yo",
    name: "Yoruba",
    modelId: null,
    license: null,
    hostedInferenceAvailable: false,
    commercialProductionEnabled: false,
    availability: "unverified",
    backends: VOICE_BACKENDS,
  },
  fat: {
    code: "fat",
    name: "Fante",
    modelId: null,
    license: null,
    hostedInferenceAvailable: false,
    commercialProductionEnabled: false,
    availability: "unverified",
    backends: VOICE_BACKENDS,
  },
};

const LANGUAGE_CODES = new Set<string>(Object.keys(AFRICAN_VOICE_CATALOG));

export function lookupAfricanVoice(language: string): AfricanVoiceRecord | null {
  const code = language.trim().toLowerCase();
  if (!LANGUAGE_CODES.has(code)) return null;
  return AFRICAN_VOICE_CATALOG[code as AfricanLanguageCode];
}
