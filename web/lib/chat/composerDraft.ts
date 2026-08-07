/** Persist chat composer drafts so they survive reloads and offline restarts. */

const DRAFT_PREFIX = "giga3_chat_draft_v1:";
const GLOBAL_DRAFT_KEY = "giga3_chat_draft_v1:__new__";

function draftKey(conversationId: string | null | undefined): string {
  if (!conversationId) return GLOBAL_DRAFT_KEY;
  return `${DRAFT_PREFIX}${conversationId}`;
}

export function readComposerDraft(conversationId?: string | null): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(draftKey(conversationId)) ?? "";
  } catch {
    return "";
  }
}

export function writeComposerDraft(
  conversationId: string | null | undefined,
  text: string
): void {
  if (typeof window === "undefined") return;
  try {
    const key = draftKey(conversationId);
    const trimmed = text;
    if (!trimmed.trim()) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, trimmed);
  } catch {
    /* quota */
  }
}

export function clearComposerDraft(conversationId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(conversationId));
  } catch {
    /* ignore */
  }
}
