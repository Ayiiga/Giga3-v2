/** Automatic chat segmentation — splits long threads into new conversations. */

export const SEGMENT_RECAP_PREFIX = "__giga3_segment_recap__\n";

const MIN_EXCHANGES = 15;
const MAX_EXCHANGES = 30;
const DEFAULT_EXCHANGES = 20;
const RECAP_TAIL_MESSAGES = 8;
const RECAP_CHAR_LIMIT = 400;

export function getSegmentExchangeLimit(): number {
  const raw = process.env.CHAT_SEGMENT_EXCHANGE_LIMIT?.trim().toLowerCase();
  if (raw === "0" || raw === "off" || raw === "false" || raw === "disabled") {
    return 0;
  }
  const parsed = raw ? Number(raw) : DEFAULT_EXCHANGES;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_EXCHANGES;
  return Math.min(MAX_EXCHANGES, Math.max(MIN_EXCHANGES, Math.round(parsed)));
}

export function countCompletedExchanges(
  messages: ReadonlyArray<{ role: string }>
): number {
  let count = 0;
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i]?.role === "user" && messages[i + 1]?.role === "assistant") {
      count += 1;
    }
  }
  return count;
}

export function continuedConversationTitle(title: string): string {
  const base = title.trim() || "New chat";
  const suffix = " (continued)";
  if (base.endsWith(suffix)) return base.slice(0, 120);
  const maxBase = 120 - suffix.length;
  const trimmed =
    base.length > maxBase ? `${base.slice(0, Math.max(0, maxBase - 1))}…` : base;
  return `${trimmed}${suffix}`;
}

export function buildSegmentContinuityRecap(
  messages: ReadonlyArray<{ role: string; content: string; createdAt?: number }>
): string {
  const dialogue = [...messages]
    .filter((m) => m.role === "user" || m.role === "assistant")
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const tail = dialogue.slice(-RECAP_TAIL_MESSAGES);
  if (tail.length === 0) return "";

  const lines = tail.map((m) => {
    const label = m.role === "user" ? "User" : "Assistant";
    const body =
      m.content.length > RECAP_CHAR_LIMIT
        ? `${m.content.slice(0, RECAP_CHAR_LIMIT)}…`
        : m.content;
    return `${label}: ${body}`;
  });

  return `Context carried over from the previous segment of this conversation:\n${lines.join("\n")}`;
}

export function shouldSegmentConversation(
  messages: ReadonlyArray<{ role: string }>,
  limit = getSegmentExchangeLimit()
): boolean {
  if (limit <= 0) return false;
  return countCompletedExchanges(messages) >= limit;
}

export function isSegmentRecapContent(content: string): boolean {
  return content.startsWith(SEGMENT_RECAP_PREFIX);
}

export function stripSegmentRecapPrefix(content: string): string {
  return isSegmentRecapContent(content)
    ? content.slice(SEGMENT_RECAP_PREFIX.length)
    : content;
}
