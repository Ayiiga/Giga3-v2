/**
 * Pure gate for accepting a conversational engine result.
 * Successful secondary-provider failover must NOT be treated as total failure.
 */

import { isChatAssistantFailureStub } from "./chatUserMessages";

export function shouldAcceptConversationalEngineResult(input: {
  providerId: string;
  content: string | undefined | null;
  usedFallback?: boolean;
}): boolean {
  const content = input.content?.trim() ?? "";
  if (!content) return false;
  if (input.providerId === "local_fallback") return false;
  if (isChatAssistantFailureStub(content)) return false;
  // usedFallback is informational (secondary provider won) — still accept.
  return true;
}
