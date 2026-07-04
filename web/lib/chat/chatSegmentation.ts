export const CHAT_SEGMENT_NOTICE =
  "Starting a new chat to keep conversations fast and organized.";

export function continuedConversationTitle(title: string): string {
  const base = title.trim() || "New chat";
  const suffix = " (continued)";
  if (base.endsWith(suffix)) return base.slice(0, 120);
  const maxBase = 120 - suffix.length;
  const trimmed =
    base.length > maxBase ? `${base.slice(0, Math.max(0, maxBase - 1))}…` : base;
  return `${trimmed}${suffix}`;
}
