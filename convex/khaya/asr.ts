import { resolveKhayaTtsLanguage } from "./languages";
import {
  KHAYA_FAILED_MESSAGE,
  KHAYA_INVALID_RESPONSE_MESSAGE,
  KHAYA_REJECTED_MESSAGE,
  KHAYA_TIMEOUT_MESSAGE,
  KhayaServiceError,
  isAbortError,
  khayaApiOrigin,
  khayaSubscriptionHeaders,
  readKhayaSubscriptionKey,
  sanitizeKhayaMessage,
} from "./subscription";
import type { KhayaFetcher } from "./tts";

const AUDIO_TYPES = new Set(["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/x-wav"]);

export type KhayaTranscript = {
  text: string;
  language: string;
};

export async function transcribeWithKhaya(args: {
  audio: Uint8Array;
  contentType: string;
  language: string;
  timestamps?: "word" | "segment";
  fetchImpl?: KhayaFetcher;
  timeoutMs?: number;
}): Promise<KhayaTranscript> {
  if (!readKhayaSubscriptionKey()) {
    throw new KhayaServiceError("not_configured", "Khaya language service is not configured.", 503);
  }
  const language = resolveKhayaTtsLanguage(args.language);
  if (!language) {
    throw new KhayaServiceError("unsupported_language", "This language is not supported for Giga3 African voice.", 422);
  }
  const contentType = args.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!AUDIO_TYPES.has(contentType) || args.audio.byteLength === 0) {
    throw new KhayaServiceError("invalid_request", "Invalid transcription request.", 400);
  }
  if (args.timestamps && args.timestamps !== "word" && args.timestamps !== "segment") {
    throw new KhayaServiceError("invalid_request", "Invalid transcription request.", 400);
  }

  const fetchImpl = args.fetchImpl ?? (fetch as unknown as KhayaFetcher);
  const timeoutMs = args.timeoutMs ?? 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const params = new URLSearchParams({ language });
  if (args.timestamps) params.set("timestamps", args.timestamps);
  try {
    const response = await fetchImpl(`${khayaApiOrigin()}/asr/v3/transcribe?${params.toString()}`, {
      method: "POST",
      headers: khayaSubscriptionHeaders({
        "Content-Type": contentType,
        Accept: "application/json",
      }),
      body: args.audio.buffer.slice(args.audio.byteOffset, args.audio.byteOffset + args.audio.byteLength) as ArrayBuffer,
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new KhayaServiceError(
        "provider_failure",
        response.status >= 500 ? KHAYA_FAILED_MESSAGE : KHAYA_REJECTED_MESSAGE,
        response.status >= 500 ? 502 : 400
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new KhayaServiceError("invalid_response", KHAYA_INVALID_RESPONSE_MESSAGE, 502);
    }
    const text =
      parsed && typeof parsed === "object" && "text" in parsed && typeof parsed.text === "string"
        ? parsed.text.trim()
        : "";
    if (!text) {
      throw new KhayaServiceError("invalid_response", KHAYA_INVALID_RESPONSE_MESSAGE, 502);
    }
    return { text: sanitizeKhayaMessage(text), language };
  } catch (err) {
    if (err instanceof KhayaServiceError) throw err;
    if (isAbortError(err)) {
      throw new KhayaServiceError("timeout", KHAYA_TIMEOUT_MESSAGE, 504);
    }
    throw new KhayaServiceError("provider_failure", KHAYA_FAILED_MESSAGE, 502);
  } finally {
    clearTimeout(timer);
  }
}
