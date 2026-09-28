/** Server-only Khaya / GhanaNLP subscription key. Never send it to the browser. */

export const KHAYA_NOT_CONFIGURED_MESSAGE = "Khaya language service is not configured.";
export const KHAYA_FAILED_MESSAGE = "Khaya language service failed.";
export const KHAYA_TIMEOUT_MESSAGE = "Khaya language service timed out.";
export const KHAYA_INVALID_RESPONSE_MESSAGE = "Khaya language service returned an invalid response.";
export const KHAYA_REJECTED_MESSAGE = "Khaya language service rejected the request.";

export const KHAYA_API_ORIGIN = "https://translation-api.ghananlp.org";

export function readKhayaSubscriptionKey(): string | null {
  const key = process.env.KHAYA_SUBSCRIPTION_KEY?.trim();
  return key ? key : null;
}

export function khayaApiOrigin(): string {
  const configured = process.env.KHAYA_API_ORIGIN?.trim();
  return (configured || KHAYA_API_ORIGIN).replace(/\/$/, "");
}

export function khayaSubscriptionHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = readKhayaSubscriptionKey();
  if (!key) {
    throw new KhayaServiceError("not_configured", KHAYA_NOT_CONFIGURED_MESSAGE, 503);
  }
  return {
    ...extra,
    "Ocp-Apim-Subscription-Key": key,
  };
}

export type KhayaErrorCode =
  | "not_configured"
  | "provider_failure"
  | "timeout"
  | "invalid_response"
  | "unsupported_language"
  | "invalid_request";

export class KhayaServiceError extends Error {
  readonly code: KhayaErrorCode;
  readonly status: number;

  constructor(code: KhayaErrorCode, message: string, status: number) {
    super(sanitizeKhayaMessage(message));
    this.name = "KhayaServiceError";
    this.code = code;
    this.status = status;
  }
}

export function sanitizeKhayaMessage(message: string): string {
  const secret = readKhayaSubscriptionKey();
  let out = message;
  if (secret) out = out.split(secret).join("[redacted]");
  return out
    .replace(/Ocp-Apim-Subscription-Key\s*[:=]\s*\S+/gi, "Ocp-Apim-Subscription-Key: [redacted]")
    .replace(/subscription-key=\S+/gi, "subscription-key=[redacted]");
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
