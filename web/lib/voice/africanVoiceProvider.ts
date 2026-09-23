/**
 * Provider seam for African TTS.
 * Production records stop on the license gate. Hosted Hugging Face, self-hosted
 * MMS, and a commercial vendor can be connected later without changing the PWA.
 */

import {
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
  timeoutMs?: number;
  endpoint?: string;
};

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

  if (record.hostedInferenceAvailable) {
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
    const result = await backend.synthesize(input.input);
    if (!result.ok) return blocked(record, result, backend.kind);
    return {
      ok: true,
      audio: result.audio,
      contentType: "audio/wav",
      backend: backend.kind,
      modelId: record.modelId,
      license: record.license,
      hostedInferenceAvailable: true,
      commercialProductionEnabled: true,
      availability: record.availability,
    };
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
