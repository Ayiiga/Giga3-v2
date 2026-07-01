/** Detect when a new assistant reply landed (send, regenerate, or edit). */

export type AssistantFingerprint = {
  id: string;
  content: string;
  createdAt?: number;
} | null;

export function fingerprintLastAssistant(
  rows:
    | { _id: string; role: string; content: string; createdAt?: number }[]
    | undefined
): AssistantFingerprint {
  if (!rows?.length) return null;
  const assistants = rows.filter((m) => m.role === "assistant");
  const last = assistants[assistants.length - 1];
  if (!last) return null;
  return {
    id: last._id,
    content: last.content,
    createdAt: last.createdAt,
  };
}

/**
 * True when the latest assistant row is a new reply for the current wait.
 * Works for send (new row), regenerate (deleted + new id), and edit (replaced tail).
 */
export function isNewAssistantReply(
  before: AssistantFingerprint,
  after: AssistantFingerprint,
  waitStartedAt: number,
  clockSkewMs = 2000
): boolean {
  if (!after) return false;
  const threshold = waitStartedAt - clockSkewMs;

  if (!before) {
    return Boolean(after.createdAt && after.createdAt >= threshold);
  }

  if (after.id !== before.id) return true;
  if (after.content !== before.content) return true;
  return Boolean(after.createdAt && after.createdAt >= threshold);
}
