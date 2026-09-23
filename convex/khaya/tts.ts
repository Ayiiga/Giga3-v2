import { resolveKhayaSpeaker, resolveKhayaTtsLanguage, type KhayaSpeakerId } from "./languages";
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
} from "./subscription";

export type KhayaFetcher = (
  input: string,
  init: {
    method: "POST" | "GET";
    headers: Record<string, string>;
    body?: BodyInit;
    signal: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}>;

const MAX_TTS_CHARS = 1000;

function isWav(contentType: string | null, bytes: Uint8Array): boolean {
  if (!contentType || bytes.byteLength < 16) return false;
  const base = contentType.split(";")[0]?.trim().toLowerCase();
  const wavType = base === "audio/wav" || base === "audio/x-wav" || base === "audio/wave";
  if (!wavType) return false;
  return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
}

export async function synthesizeKhayaTts(args: {
  text: string;
  language: string;
  speakerId?: string;
  fetchImpl?: KhayaFetcher;
  timeoutMs?: number;
}): Promise<Uint8Array> {
  if (!readKhayaSubscriptionKey()) {
    throw new KhayaServiceError("not_configured", "Khaya language service is not configured.", 503);
  }
  const language = resolveKhayaTtsLanguage(args.language);
  if (!language) {
    throw new KhayaServiceError("unsupported_language", "This language is not supported for Giga3 African voice.", 422);
  }
  const text = args.text.trim();
  if (!text || text.length > MAX_TTS_CHARS) {
    throw new KhayaServiceError("invalid_request", "Invalid speech request.", 400);
  }
  const speakerId: KhayaSpeakerId = resolveKhayaSpeaker(args.speakerId);
  const fetchImpl = args.fetchImpl ?? (fetch as unknown as KhayaFetcher);
  const timeoutMs = args.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${khayaApiOrigin()}/tts/v2/synthesize`, {
      method: "POST",
      headers: khayaSubscriptionHeaders({
        "Content-Type": "application/json",
        Accept: "audio/wav",
      }),
      body: JSON.stringify({
        text,
        language,
        speaker_id: speakerId,
        stream: false,
        format: "wav",
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new KhayaServiceError(
        "provider_failure",
        response.status >= 500 ? KHAYA_FAILED_MESSAGE : KHAYA_REJECTED_MESSAGE,
        response.status >= 500 ? 502 : 400
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!isWav(response.headers.get("content-type"), bytes)) {
      throw new KhayaServiceError("invalid_response", KHAYA_INVALID_RESPONSE_MESSAGE, 502);
    }
    return bytes;
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
