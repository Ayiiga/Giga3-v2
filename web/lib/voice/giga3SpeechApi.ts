/**
 * Server-side Giga3 speech API: POST /v1/audio/speech.
 * Mount `handleGiga3SpeechRequest` from the Convex HTTP runtime only after a
 * licensed provider is connected. Do not pass request JSON into runtime deps.
 * The static PWA must not call Hugging Face itself.
 */

import { synthesizeGiga3AfricanSpeech } from "../../../convex/khaya/speech";
import { lookupAfricanVoice, type AfricanVoiceRecord } from "@/lib/voice/africanVoiceCatalog";
import { synthesizeWithAfricanProvider, type AfricanVoiceRuntime } from "@/lib/voice/africanVoiceProvider";
import {
  ENGLISH_STAYS_ON_DEVICE_MESSAGE,
  GIGA3_AFRICAN_VOICE_MODEL,
  INVALID_SPEECH_REQUEST_MESSAGE,
  RESEARCH_ONLY_MESSAGE,
  UNSUPPORTED_LANGUAGE_MESSAGE,
  VOICE_BACKENDS,
  sanitizePublicVoiceMessage,
  type Giga3SpeechRequest,
  type SpeechFailureBody,
  type SpeechFailureCode,
} from "@/lib/voice/africanVoiceTypes";

const MAX_INPUT_CHARS = 1000;

export type SpeechHttpResponse = {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
};

export type SpeechRuntimeDeps = AfricanVoiceRuntime & {
  catalogLookup?: (language: string) => AfricanVoiceRecord | null;
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

function jsonResponse(status: number, payload: SpeechFailureBody): SpeechHttpResponse {
  const safe = {
    ...payload,
    error: sanitizePublicVoiceMessage(payload.error),
  };
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: new TextEncoder().encode(JSON.stringify(safe)),
  };
}

function failure(statusCode: SpeechFailureCode, error: string, extra: Partial<SpeechFailureBody> = {}): SpeechHttpResponse {
  return jsonResponse(FAILURE_STATUS[statusCode], {
    error,
    code: statusCode,
    backends: extra.backends ?? VOICE_BACKENDS,
    ...extra,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseGiga3SpeechRequest(
  body: unknown
): { ok: true; request: Giga3SpeechRequest } | { ok: false; response: SpeechHttpResponse } {
  if (!isRecord(body)) {
    return { ok: false, response: failure("invalid_request", INVALID_SPEECH_REQUEST_MESSAGE) };
  }
  if (body.model !== GIGA3_AFRICAN_VOICE_MODEL) {
    return { ok: false, response: failure("invalid_request", INVALID_SPEECH_REQUEST_MESSAGE) };
  }
  if (typeof body.language !== "string" || body.language.trim() === "") {
    return { ok: false, response: failure("invalid_request", INVALID_SPEECH_REQUEST_MESSAGE) };
  }
  if (typeof body.voice !== "string" || body.voice.trim() === "") {
    return { ok: false, response: failure("invalid_request", INVALID_SPEECH_REQUEST_MESSAGE) };
  }
  if (typeof body.input !== "string" || body.input.trim() === "" || body.input.length > MAX_INPUT_CHARS) {
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

export async function runGiga3Speech(
  request: Giga3SpeechRequest,
  deps: SpeechRuntimeDeps = {}
): Promise<SpeechHttpResponse> {
  if (request.language === "en" || request.language === "eng" || request.language.startsWith("en-")) {
    return failure("unsupported_language", ENGLISH_STAYS_ON_DEVICE_MESSAGE, { language: request.language });
  }

  const lookup = deps.catalogLookup ?? lookupAfricanVoice;
  const record = lookup(request.language);
  if (!record) {
    return failure("unsupported_language", UNSUPPORTED_LANGUAGE_MESSAGE, { language: request.language });
  }

  if (record.modelId === "facebook/mms-tts-aka" || record.modelId === "facebook/mms-tts-ewe") {
    return failure("not_enabled", RESEARCH_ONLY_MESSAGE, {
      language: record.code,
      modelId: record.modelId,
      license: record.license ?? "cc-by-nc-4.0",
      hostedInferenceAvailable: false,
      commercialProductionEnabled: false,
      availability: "development_research_only",
    });
  }

  if (record.hostedInferenceAvailable && record.commercialProductionEnabled) {
    const hosted = await synthesizeWithAfricanProvider(
      record,
      { input: request.input, voice: request.voice },
      deps
    );
    if (!hosted.ok) {
      return failure(hosted.code, hosted.error, {
        language: record.code,
        modelId: hosted.modelId ?? undefined,
        license: hosted.license ?? undefined,
        hostedInferenceAvailable: hosted.hostedInferenceAvailable,
        commercialProductionEnabled: hosted.commercialProductionEnabled,
        availability: hosted.availability,
        backends: hosted.backends,
      });
    }
    return {
      status: 200,
      headers: { "content-type": "audio/wav" },
      body: hosted.audio,
    };
  }

  if (record.khayaLanguage && record.commercialProductionEnabled) {
    return synthesizeGiga3AfricanSpeech(request, {
      fetchImpl: deps.khayaFetch,
      timeoutMs: deps.timeoutMs,
    });
  }

  const result = await synthesizeWithAfricanProvider(
    record,
    { input: request.input, voice: request.voice },
    deps
  );

  if (!result.ok) {
    return failure(result.code, result.error, {
      language: record.code,
      modelId: result.modelId ?? undefined,
      license: result.license ?? undefined,
      hostedInferenceAvailable: result.hostedInferenceAvailable,
      commercialProductionEnabled: result.commercialProductionEnabled,
      availability: result.availability,
      backends: result.backends,
    });
  }

  return {
    status: 200,
    headers: { "content-type": "audio/wav" },
    body: result.audio,
  };
}

export async function handleGiga3SpeechRequest(body: unknown): Promise<SpeechHttpResponse> {
  const parsed = parseGiga3SpeechRequest(body);
  if (!parsed.ok) return parsed.response;
  return runGiga3Speech(parsed.request, { catalogLookup: lookupAfricanVoice });
}
