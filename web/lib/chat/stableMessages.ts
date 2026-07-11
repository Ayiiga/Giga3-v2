import type { UiMessage } from "@/components/chat/MessageList";

export function toUiMessages(
  rows: { _id: string; role: string; content?: unknown; createdAt?: number }[]
): UiMessage[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r._id,
      role: r.role as "user" | "assistant",
      content:
        typeof r.content === "string"
          ? r.content
          : r.content == null
            ? ""
            : String(r.content),
      createdAt: r.createdAt,
    }));
}

export function messagesEqual(a: UiMessage[], b: UiMessage[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id === "pending-user" && b[i].id === "pending-user") {
      if (a[i].role !== b[i].role || a[i].content !== b[i].content) {
        return false;
      }
      continue;
    }
    if (
      a[i].id !== b[i].id ||
      a[i].role !== b[i].role ||
      a[i].content !== b[i].content ||
      a[i].createdAt !== b[i].createdAt
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Scroll anchor that ignores optimistic id swaps (pending-user → Convex _id)
 * when the user message content is unchanged.
 */
export function messageListScrollKey(
  messages: UiMessage[]
): string | undefined {
  const last = messages[messages.length - 1];
  if (!last) return undefined;
  if (last.role === "assistant") {
    return `a:${messages.length}:${last.id}`;
  }
  return `u:${messages.length}:${last.content}`;
}

export function buildUiMessages(
  messagesRaw: { _id: string; role: string; content: string; createdAt?: number }[] | undefined,
  pendingUserText: string | null
): UiMessage[] {
  const base = toUiMessages(messagesRaw ?? []);
  if (!pendingUserText) return base;
  const last = base[base.length - 1];
  if (last?.role === "user" && last.content === pendingUserText) {
    return base;
  }
  return [
    ...base,
    {
      id: "pending-user",
      role: "user" as const,
      content: pendingUserText,
      createdAt: Date.now(),
    },
  ];
}
