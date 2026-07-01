import type { UiMessage } from "@/components/chat/MessageList";

const PREFIX = "giga3_msg_cache:";

type CachedThread = {
  messages: UiMessage[];
  savedAt: number;
};

export function readCachedMessages(conversationId: string): UiMessage[] | null {
  if (typeof sessionStorage === "undefined" || !conversationId) return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${conversationId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedThread;
    if (!Array.isArray(parsed.messages)) return null;
    return parsed.messages;
  } catch {
    return null;
  }
}

export function writeCachedMessages(
  conversationId: string,
  messages: UiMessage[]
): void {
  if (typeof sessionStorage === "undefined" || !conversationId || messages.length === 0) {
    return;
  }
  try {
    const payload: CachedThread = { messages, savedAt: Date.now() };
    sessionStorage.setItem(`${PREFIX}${conversationId}`, JSON.stringify(payload));
  } catch {
    /* quota — ignore */
  }
}

export function clearCachedMessages(conversationId: string): void {
  if (typeof sessionStorage === "undefined" || !conversationId) return;
  try {
    sessionStorage.removeItem(`${PREFIX}${conversationId}`);
  } catch {
    /* ignore */
  }
}
