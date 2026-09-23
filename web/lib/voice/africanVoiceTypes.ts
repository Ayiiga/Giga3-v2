/**
 * Public contract for Giga3 African-language speech.
 * Safe to import from the PWA. No secrets and no provider credentials.
 */

export const GIGA3_AFRICAN_VOICE_MODEL = "giga3-african-voice" as const;
export const GIGA3_SPEECH_PATH = "/v1/audio/speech" as const;

export const HF_NOT_CONFIGURED_MESSAGE = "Hugging Face voice service is not configured.";
export const RESEARCH_ONLY_MESSAGE =
  "Model available for development/research but not enabled for commercial production.";
export const HF_PROVIDER_FAILED_MESSAGE = "Hugging Face voice service failed.";
export const HF_TIMEOUT_MESSAGE = "Hugging Face voice service timed out.";
export const HF_INVALID_RESPONSE_MESSAGE =
  "Hugging Face voice service returned an invalid response.";
export const HF_HOSTED_UNAVAILABLE_MESSAGE =
  "Hugging Face hosted inference is not available for this model.";
export const UNSUPPORTED_LANGUAGE_MESSAGE =
  "This language is not supported for Giga3 African voice.";
export const UNVERIFIED_LANGUAGE_MESSAGE =
  "This language is not production-supported until its model, provider, and license are verified.";
export const ENGLISH_STAYS_ON_DEVICE_MESSAGE = "English stays on the device speech path.";
export const INVALID_SPEECH_REQUEST_MESSAGE = "Invalid speech request.";

export const VOICE_BACKENDS = ["huggingface-hosted", "self-hosted-mms", "commercial"] as const;
export type VoiceBackendKind = (typeof VOICE_BACKENDS)[number];

export type SpeechFailureCode =
  | "not_configured"
  | "not_enabled"
  | "unsupported_language"
  | "provider_failure"
  | "timeout"
  | "invalid_response"
  | "invalid_request"
  | "hosted_unavailable";

export type Giga3SpeechRequest = {
  model: typeof GIGA3_AFRICAN_VOICE_MODEL;
  language: string;
  voice: string;
  input: string;
  response_format: "wav";
};

export type SpeechFailureBody = {
  error: string;
  code: SpeechFailureCode;
  language?: string;
  modelId?: string;
  license?: string;
  hostedInferenceAvailable?: boolean;
  commercialProductionEnabled?: boolean;
  availability?: "development_research_only" | "unverified";
  backends: readonly VoiceBackendKind[];
};

/** Strip credential-shaped fragments from any string that might reach the client. */
export function sanitizePublicVoiceMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bhf_[A-Za-z0-9_-]+\b/g, "[redacted]");
}
