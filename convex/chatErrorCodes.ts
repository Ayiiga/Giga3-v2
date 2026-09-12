/** Structured chat error codes — safe for logs; map to user-facing copy in the client. */

export const CHAT_ERROR_CODES = {
  PROVIDER_TIMEOUT: "CHAT_PROVIDER_TIMEOUT",
  PROVIDER_RATE_LIMIT: "CHAT_PROVIDER_RATE_LIMIT",
  PROVIDER_AUTH_ERROR: "CHAT_PROVIDER_AUTH_ERROR",
  PROVIDER_NETWORK_ERROR: "CHAT_PROVIDER_NETWORK_ERROR",
  PROVIDER_INVALID_RESPONSE: "CHAT_PROVIDER_INVALID_RESPONSE",
  STREAM_INTERRUPTED: "CHAT_STREAM_INTERRUPTED",
  ALL_PROVIDERS_FAILED: "CHAT_ALL_PROVIDERS_FAILED",
  RESEARCH_TIMEOUT: "CHAT_RESEARCH_TIMEOUT",
  RECOVERY_TIMEOUT: "CHAT_RECOVERY_TIMEOUT",
  WORKER_TIMEOUT: "CHAT_WORKER_TIMEOUT",
  UNKNOWN: "CHAT_UNKNOWN_ERROR",
} as const;

export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[keyof typeof CHAT_ERROR_CODES];

export function classifyProviderError(message: string): ChatErrorCode {
  const lower = message.toLowerCase();
  if (/timed out|timeout|aborted|abort/i.test(lower)) {
    return CHAT_ERROR_CODES.PROVIDER_TIMEOUT;
  }
  if (/rate limit|429|too many requests/i.test(lower)) {
    return CHAT_ERROR_CODES.PROVIDER_RATE_LIMIT;
  }
  if (/401|403|unauthorized|invalid api key|api key/i.test(lower)) {
    return CHAT_ERROR_CODES.PROVIDER_AUTH_ERROR;
  }
  if (/network|fetch failed|econnreset|enotfound|socket/i.test(lower)) {
    return CHAT_ERROR_CODES.PROVIDER_NETWORK_ERROR;
  }
  if (/empty response|invalid json|malformed/i.test(lower)) {
    return CHAT_ERROR_CODES.PROVIDER_INVALID_RESPONSE;
  }
  return CHAT_ERROR_CODES.UNKNOWN;
}
