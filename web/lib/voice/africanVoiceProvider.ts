/**
 * Provider seam for African TTS.
 * Production records stop on the license gate. Hosted Hugging Face, self-hosted
 * MMS, and a commercial vendor can be connected later without changing the PWA.
 */

import {
  createCommercialVoiceProvider,
  createHuggingFaceHostedProvider,
  createSelfHostedMmsProvider,
  type AfricanVoiceBackend,
  type BackendSynthesisResult,
} from "@/lib/voice/africanVoiceBackends";
import type { AfricanVoiceRecord } from "@/lib/voice/africanVoiceCatalog";
import {
  HF_HOSTED_UNAVAILABLE_MESSAGE,
  RESEARCH_ONLY_MESSAGE,
  UNVERIFIED_LANGUAGE_MESSAGE,
  VOICE_BACKENDS,
  type SpeechFailureCode,
  type VoiceBackendKind,
} from "@/lib/voice/africanVoiceTypes";
import type { HostedSpeechFetcher } from "@/lib/voice/huggingFaceTTS";

export type ProviderSynthesisResult =
  | {
      ok: true;
      audio: Uint8Array;
      contentType: "audio/wav";
      backend: VoiceBackendKind;
      modelId: string | null;
      license: AfricanVoiceRecord["license"];
      hostedInferenceAvailable: boolean;
      commercialProductionEnabled: boolean;
      availability: AfricanVoiceRecord["availability"];
    }
  | {
      ok: false;
      code: Exclude<SpeechFailureCode, "invalid_request">;
      error: string;
      backend: VoiceBackendKind | null;
      modelId: string | null;
      license: AfricanVoiceRecord["license"];
      hostedInferenceAvailable: boolean;
      commercialProductionEnabled: boolean;
      availability: AfricanVoiceRecord["availability"];
      backends: readonly VoiceBackendKind[];
    };

export type AfricanVoiceRuntime = {
  fetchImpl?: HostedSpeechFetcher;
  khayaFetch?: import("../../../convex/khaya/tts").KhayaFetcher;
  timeoutMs?: number;
  endpoint?: string;
};

const RESEARCH_ONLY_MMS_MODELS = new Set(["facebook/mms-tts-aka", "facebook/mms-tts-ewe"]);

function isResearchOnlyMms(modelId: string | null): boolean {
  return modelId != null && RESEARCH_ONLY_MMS_MODELS.has(modelId);
}

function blocked(
  record: AfricanVoiceRecord,
  failure: BackendSynthesisResult & { ok: false },
  backend: VoiceBackendKind | null
): ProviderSynthesisResult {
  const code = failure.code === "invalid_request" ? "not_configured" : failure.code;
  return {
    ok: false,
    code,
    error: failure.error,
    backend,
    modelId: record.modelId,
    license: record.license,
    hostedInferenceAvailable: record.hostedInferenceAvailable,
    commercialProductionEnabled: record.commercialProductionEnabled,
    availability: record.availability,
    backends: record.backends ?? VOICE_BACKENDS,
  };
}

export function listVoiceBackends(): readonly VoiceBackendKind[] {
  return VOICE_BACKENDS;
}

export function selectVoiceBackend(
  record: AfricanVoiceRecord,
  runtime: AfricanVoiceRuntime = {}
): AfricanVoiceBackend | null {
  if (isResearchOnlyMms(record.modelId)) return null;
  if (!record.commercialProductionEnabled || !record.modelId || !record.hostedInferenceAvailable) {
    return null;
  }
  if (!runtime.endpoint) return null;
  return createHuggingFaceHostedProvider({
    modelId: record.modelId,
    endpoint: runtime.endpoint,
    fetchImpl: runtime.fetchImpl,
    timeoutMs: runtime.timeoutMs,
  });
}

export async function synthesizeWithAfricanProvider(
  record: AfricanVoiceRecord,
  input: { input: string; voice: string },
  runtime: AfricanVoiceRuntime = {}
): Promise<ProviderSynthesisResult> {
  if (isResearchOnlyMms(record.modelId)) {
    const refused = blocked(record, { ok: false, code: "not_enabled", error: RESEARCH_ONLY_MESSAGE }, null);
    return {
      ...refused,
      commercialProductionEnabled: false,
      hostedInferenceAvailable: false,
      availability: "development_research_only",
    };
  }

  if (record.hostedInferenceAvailable && record.commercialProductionEnabled && record.modelId) {
    if (!runtime.endpoint) {
      return blocked(
        record,
        { ok: false, code: "hosted_unavailable", error: HF_HOSTED_UNAVAILABLE_MESSAGE },
        "huggingface-hosted"
      );
    }
    const backend = createHuggingFaceHostedProvider({
      modelId: record.modelId,
      endpoint: runtime.endpoint,
      fetchImpl: runtime.fetchImpl,
      timeoutMs: runtime.timeoutMs,
    });
    const hosted = await backend.synthesize(input.input);
    if (!hosted.ok) return blocked(record, hosted, backend.kind);
    return {
      ok: true,
      audio: hosted.audio,
      contentType: "audio/wav",
      backend: backend.kind,
      modelId: record.modelId,
      license: record.license,
      hostedInferenceAvailable: true,
      commercialProductionEnabled: true,
      availability: record.availability,
    };
  }

  if (record.khayaLanguage && record.commercialProductionEnabled) {
    const backend = createCommercialVoiceProvider({
      language: record.khayaLanguage,
      voice: input.voice,
      fetchImpl: runtime.khayaFetch,
      timeoutMs: runtime.timeoutMs,
    });
    const commercial = await backend.synthesize(input.input);
    if (!commercial.ok) return blocked(record, commercial, backend.kind);
    return {
      ok: true,
      audio: commercial.audio,
      contentType: "audio/wav",
      backend: backend.kind,
      modelId: "ghananlp-tts-v2",
      license: "khaya-eula",
      hostedInferenceAvailable: false,
      commercialProductionEnabled: true,
      availability: "khaya",
    };
  }

  if (record.availability === "unverified" || !record.modelId) {
    return blocked(
      record,
      { ok: false, code: "unsupported_language", error: UNVERIFIED_LANGUAGE_MESSAGE },
      null
    );
  }

  if (!record.commercialProductionEnabled) {
    return blocked(record, { ok: false, code: "not_enabled", error: RESEARCH_ONLY_MESSAGE }, null);
  }

  const selfHosted = createSelfHostedMmsProvider();
  const selfHostedResult = await selfHosted.synthesize();
  if (!selfHostedResult.ok) return blocked(record, selfHostedResult, selfHosted.kind);
  return blocked(
    record,
    { ok: false, code: "not_configured", error: "Self-hosted MMS inference is not configured." },
    "self-hosted-mms"
  );
}
