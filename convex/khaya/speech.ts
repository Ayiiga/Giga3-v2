import {
  ENGLISH_STAYS_ON_DEVICE_MESSAGE,
  GIGA3_AFRICAN_VOICE_MODEL,
  INVALID_SPEECH_REQUEST_MESSAGE,
  UNSUPPORTED_LANGUAGE_MESSAGE,
  VOICE_BACKENDS,
  sanitizePublicVoiceMessage,
  type Giga3SpeechRequest,
  type SpeechFailureBody,
  type SpeechFailureCode,
} from "../../web/lib/voice/africanVoiceTypes";
import { resolveCommercialKhayaTtsLanguage, resolveKhayaSpeaker } from "./languages";
import { KhayaServiceError, sanitizeKhayaMessage } from "./subscription";
import { synthesizeKhayaTts, type KhayaFetcher } from "./tts";

const MAX_INPUT_CHARS = 1000;

export type KhayaSpeechResponse = {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
};

const FAILURE_STATUS: Record<SpeechFailureCode, number> = {
  invalid_request: 400,
  unsupported_language: 422,
  not_configured: 503,
  not_enabled: 503,
  hosted_unavailable: 503,
  provider_failure: 502,
  invalid_response: 502,
  timeout: 504,
};

function jsonResponse(status: number, payload: SpeechFailureBody): KhayaSpeechResponse {
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: new TextEncoder().encode(JSON.stringify({ ...payload, error: sanitizeKhayaMessage(sanitizePublicVoiceMessage(payload.error)) })),
  };
}

function failure(code: SpeechFailureCode, error: string, extra: Partial<SpeechFailureBody> = {}): KhayaSpeechResponse {
  return jsonResponse(FAILURE_STATUS[code], {
    error,
    code,
    backends: extra.backends ?? VOICE_BACKENDS,
    ...extra,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseGiga3SpeechRequest(
  body: unknown
): { ok: true; request: Giga3SpeechRequest } | { ok: false; response: KhayaSpeechResponse } {
  if (!isRecord(body)) return { ok: false, response: failure("invalid_request", INVALID_SPEECH_REQUEST_MESSAGE) };
  if (body.model !== GIGA3_AFRICAN_VOICE_MODEL) {
    return { ok: false, response: failure("invalid_request", INVALID_SPEECH_REQUEST_MESSAGE) };
  }
  if (typeof body.language !== "string" || !body.language.trim()) {
    return { ok: false, response: failure("invalid_request", INVALID_SPEECH_REQUEST_MESSAGE) };
  }
  if (typeof body.voice !== "string" || !body.voice.trim()) {
    return { ok: false, response: failure("invalid_request", INVALID_SPEECH_REQUEST_MESSAGE) };
  }
  if (typeof body.input !== "string" || !body.input.trim() || body.input.length > MAX_INPUT_CHARS) {
    return { ok: false, response: failure("invalid_request", INVALID_SPEECH_REQUEST_MESSAGE) };
  }
  if (body.response_format !== "wav") {
    return { ok: false, response: failure("invalid_request", INVALID_SPEECH_REQUEST_MESSAGE) };
  }
  return {
    ok: true,
    request: {
      model: GIGA3_AFRICAN_VOICE_MODEL,
      language: body.language.trim().toLowerCase(),
      voice: body.voice.trim(),
      input: body.input,
      response_format: "wav",
    },
  };
}

export function isEnglishSpeechLanguage(language: string): boolean {
  const code = language.trim().toLowerCase();
  return code === "en" || code === "eng" || code.startsWith("en-");
}

export async function synthesizeGiga3AfricanSpeech(
  request: Giga3SpeechRequest,
  deps: { fetchImpl?: KhayaFetcher; timeoutMs?: number } = {}
): Promise<KhayaSpeechResponse> {
  if (isEnglishSpeechLanguage(request.language)) {
    return failure("unsupported_language", ENGLISH_STAYS_ON_DEVICE_MESSAGE, { language: request.language });
  }
  const language = resolveCommercialKhayaTtsLanguage(request.language);
  if (!language) {
    return failure("unsupported_language", UNSUPPORTED_LANGUAGE_MESSAGE, { language: request.language });
  }
  try {
    const audio = await synthesizeKhayaTts({
      text: request.input,
      language,
      speakerId: resolveKhayaSpeaker(request.voice),
      fetchImpl: deps.fetchImpl,
      timeoutMs: deps.timeoutMs,
    });
    return {
      status: 200,
      headers: { "content-type": "audio/wav" },
      body: audio,
    };
  } catch (err) {
    if (err instanceof KhayaServiceError) {
      return failure(err.code, err.message, {
        language,
        modelId: "ghananlp-tts-v2",
        license: "khaya-eula",
        hostedInferenceAvailable: false,
        commercialProductionEnabled: true,
        availability: "khaya",
      });
    }
    return failure("provider_failure", "Khaya language service failed.", { language, modelId: "ghananlp-tts-v2" });
  }
}

/** Production POST /v1/audio/speech handler. Twi and Ewe only; MMS is not called. */
export async function handleGiga3SpeechRequest(
  body: unknown,
  deps: { fetchImpl?: KhayaFetcher; timeoutMs?: number } = {}
): Promise<KhayaSpeechResponse> {
  const parsed = parseGiga3SpeechRequest(body);
  if (!parsed.ok) return parsed.response;
  return synthesizeGiga3AfricanSpeech(parsed.request, deps);
}
