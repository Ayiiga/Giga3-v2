import type { OutboxEntry } from "@/lib/chat/offlineOutbox";

export type PendingMessageDeliveryState = "queued" | "sending" | null;

export function resolvePendingDeliveryState(
  pendingContent: string | undefined,
  outboxEntries: OutboxEntry[],
  flushingOutboxId: string | null
): PendingMessageDeliveryState {
  if (!pendingContent) return null;
  const entry = outboxEntries.find((row) => row.content === pendingContent);
  if (!entry) return null;
  if (flushingOutboxId === entry.id) return "sending";
  return "queued";
}

export function previewOutboxContent(content: string, max = 72): string {
  const trimmed = content.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
