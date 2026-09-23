import { resolveKhayaTranslationLanguage } from "./languages";
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

const MAX_TRANSLATION_CHARS = 1000;
const UNSUPPORTED_PAIR = "This language pair is not supported for Giga3 translation.";

export async function translateWithKhaya(args: {
  text: string;
  source: string;
  target: string;
  fetchImpl?: KhayaFetcher;
  timeoutMs?: number;
}): Promise<{ text: string; source: string; target: string }> {
  if (!readKhayaSubscriptionKey()) {
    throw new KhayaServiceError("not_configured", "Khaya language service is not configured.", 503);
  }
  const source = resolveKhayaTranslationLanguage(args.source);
  const target = resolveKhayaTranslationLanguage(args.target);
  if (!source || !target || source === target) {
    throw new KhayaServiceError("unsupported_language", UNSUPPORTED_PAIR, 422);
  }
  const text = args.text.trim();
  if (!text || text.length > MAX_TRANSLATION_CHARS) {
    throw new KhayaServiceError("invalid_request", "Invalid translation request.", 400);
  }

  const fetchImpl = args.fetchImpl ?? (fetch as unknown as KhayaFetcher);
  const timeoutMs = args.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${khayaApiOrigin()}/v2/translate`, {
      method: "POST",
      headers: khayaSubscriptionHeaders({
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
      body: JSON.stringify({ in: text, lang: `${source}-${target}` }),
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
    const translated = readTranslationBody(raw);
    if (!translated) {
      throw new KhayaServiceError("invalid_response", KHAYA_INVALID_RESPONSE_MESSAGE, 502);
    }
    return { text: sanitizeKhayaMessage(translated), source, target };
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

function readTranslationBody(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
  } catch {
    /* Khaya may return the translation as plain text. */
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return null;
  return trimmed;
}
