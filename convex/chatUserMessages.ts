import { CHAT_ERROR_CODES, type ChatErrorCode } from "./chatErrorCodes";
import { CHAT_RECOVERY_TIMEOUT_SNIPPET } from "./chatTiming";

const ENGINE_FAILURE_SNIPPET = "having trouble reaching our ai services";

/** True when assistant text is a known server-side failure stub (not user content). */
export function isChatAssistantFailureStub(content: string): boolean {
  if (!content?.trim()) return false;
  const lower = content.toLowerCase();
  if (lower.includes(CHAT_RECOVERY_TIMEOUT_SNIPPET.toLowerCase())) return true;
  if (lower.includes(ENGINE_FAILURE_SNIPPET) && lower.includes("tap send")) return true;
  if (lower.includes("ai could not complete") && lower.includes("try again")) return true;
  if (lower.includes("temporarily unable to generate a response")) return true;
  if (lower.includes("live research is temporarily unavailable")) return true;
  if (lower.includes("taking longer than expected") && lower.includes("trying another ai service")) {
    return true;
  }
  return false;
}

export type ChatUserMessageContext = {
  research?: boolean;
  cancelled?: boolean;
  fallbackUsed?: boolean;
};

/** Map structured error codes to safe user-facing copy (no secrets or internal ids). */
export function chatUserFacingMessage(
  code: ChatErrorCode,
  context: ChatUserMessageContext = {}
): string {
  if (context.cancelled) {
    return "Generation was cancelled.";
  }
  switch (code) {
    case CHAT_ERROR_CODES.PROVIDER_TIMEOUT:
    case CHAT_ERROR_CODES.WORKER_TIMEOUT:
    case CHAT_ERROR_CODES.RECOVERY_TIMEOUT:
      return context.fallbackUsed
        ? "Giga3 is taking longer than expected. We're trying another AI service."
        : "Giga3 is taking longer than expected. We're trying another AI service.";
    case CHAT_ERROR_CODES.RESEARCH_TIMEOUT:
      return "Live research is temporarily unavailable. Please try again shortly.";
    case CHAT_ERROR_CODES.ALL_PROVIDERS_FAILED:
      return "Giga3 AI is temporarily unable to generate a response. Your message has been saved safely.";
    case CHAT_ERROR_CODES.PROVIDER_RATE_LIMIT:
      return "Giga3 is receiving a high volume of requests. Your message was saved — please try again in a moment.";
    default:
      return "Giga3 AI is temporarily unable to generate a response. Your message has been saved safely.";
  }
}

export function recoveryErrorCodeForJob(job: {
  liveWeb?: boolean;
  researchCapability?: string;
  kind?: string;
  content?: string;
}): ChatErrorCode {
  if (job.liveWeb) {
    return CHAT_ERROR_CODES.RESEARCH_TIMEOUT;
  }
  if (job.kind === "conversational") {
    return CHAT_ERROR_CODES.ALL_PROVIDERS_FAILED;
  }
  return CHAT_ERROR_CODES.RECOVERY_TIMEOUT;
}
