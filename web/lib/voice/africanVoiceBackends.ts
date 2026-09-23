/**
 * Backend implementations behind the African voice provider.
 * Hosted Hugging Face calls run only when a caller opts in.
 * Self-hosted MMS and commercial vendors are seams: neither is connected,
 * and neither is selected while a checkpoint is research-only.
 */

import { type SpeechFailureCode, type VoiceBackendKind } from "@/lib/voice/africanVoiceTypes";
import {
  HuggingFaceVoiceError,
  requestHuggingFaceHostedSpeech,
  type HostedSpeechFetcher,
} from "@/lib/voice/huggingFaceTTS";

export type BackendSynthesisResult =
  | { ok: true; audio: Uint8Array }
  | { ok: false; code: SpeechFailureCode; error: string };

export type AfricanVoiceBackend = {
  kind: VoiceBackendKind;
  synthesize(input?: string): Promise<BackendSynthesisResult>;
};

export function createHuggingFaceHostedProvider(options: {
  modelId: string;
  endpoint: string;
  fetchImpl?: HostedSpeechFetcher;
  timeoutMs?: number;
}): AfricanVoiceBackend {
  return {
    kind: "huggingface-hosted",
    async synthesize(input?: string) {
      try {
        const result = await requestHuggingFaceHostedSpeech({
          modelId: options.modelId,
          input: input ?? "",
          endpoint: options.endpoint,
          hostedInferenceAvailable: true,
          fetchImpl: options.fetchImpl,
          timeoutMs: options.timeoutMs,
        });
        return { ok: true, audio: result.audio };
      } catch (err) {
        if (err instanceof HuggingFaceVoiceError) {
          return { ok: false, code: err.code, error: err.message };
        }
        return { ok: false, code: "provider_failure", error: "Hugging Face voice service failed." };
      }
    },
  };
}

export function createSelfHostedMmsProvider(): AfricanVoiceBackend {
  return {
    kind: "self-hosted-mms",
    async synthesize() {
      return {
        ok: false,
        code: "not_configured",
        error: "Self-hosted MMS inference is not configured.",
      };
    },
  };
}

export function createCommercialVoiceProvider(): AfricanVoiceBackend {
  return {
    kind: "commercial",
    async synthesize() {
      return {
        ok: false,
        code: "not_configured",
        error: "A commercial African TTS provider is not configured.",
      };
    },
  };
}
