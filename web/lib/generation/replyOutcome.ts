import {
  fingerprintLastAssistant,
  isNewAssistantReply,
  type AssistantFingerprint,
} from "@/lib/chat/replyDetection";

export type ReplyAssessResult = "success" | "partial" | "waiting" | "no_reply";

/** True when assistant text is non-empty and not a known server-side failure stub. */
export function hasUsableAssistantContent(content: string | undefined): boolean {
  if (!content || typeof content !== "string") return false;
  const trimmed = content.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes("ai could not complete") && lower.includes("try again")) {
    return false;
  }
  return true;
}

type MessageRow = {
  _id: string;
  role: string;
  content: string;
  createdAt?: number;
};

/**
 * Decide whether a reply wait should resolve as success, still pending, or failed.
 * Handles streaming updates on the same assistant row id.
 */
export function assessReplyFromMessages(
  rows: MessageRow[] | undefined,
  before: AssistantFingerprint,
  waitStartedAt: number,
  assistantBaseline: number
): ReplyAssessResult {
  if (!rows?.length) return "waiting";

  const after = fingerprintLastAssistant(rows);
  const assistants = rows.filter((m) => m.role === "assistant").length;
  const newByFingerprint = isNewAssistantReply(before, after, waitStartedAt);
  const newByCount = assistants > assistantBaseline;
  const streamingSameRow =
    Boolean(before && after && after.id === before.id && after.content !== before.content);

  if (newByFingerprint || newByCount || streamingSameRow) {
    const content = after?.content ?? "";
    if (hasUsableAssistantContent(content)) return "success";
    if (content.trim().length > 0) return "partial";
    return "waiting";
  }

  return "waiting";
}
