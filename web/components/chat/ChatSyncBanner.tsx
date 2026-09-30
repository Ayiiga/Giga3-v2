"use client";

import { OfflineModeBanner } from "@/components/pwa/OfflineModeBanner";
import { Button } from "@/components/ui/Button";
import type { OutboxEntry } from "@/lib/chat/offlineOutbox";
import { previewOutboxContent } from "@/lib/chat/outboxUi";
import { memo } from "react";

type ChatSyncBannerProps = {
  onRetrySync?: () => void;
  onCancelOutbox?: (id: string) => void;
  outboxCount?: number;
  outboxEntries?: OutboxEntry[];
  isSyncingOutbox?: boolean;
  online?: boolean;
};

/**
 * Offline + outbox status. Sending while offline queues messages for sync when back online.
 */
export const ChatSyncBanner = memo(function ChatSyncBanner({
  onRetrySync,
  onCancelOutbox,
  outboxCount = 0,
  outboxEntries = [],
  isSyncingOutbox = false,
  online = true,
}: ChatSyncBannerProps) {
  if (online && outboxCount === 0 && !isSyncingOutbox) return null;

  if (!online) {
    return (
      <div className="space-y-2 px-2 sm:px-4">
        <OfflineModeBanner
          message={
            outboxCount > 0
              ? `Offline — ${outboxCount} message${outboxCount === 1 ? "" : "s"} queued. They will send when you reconnect.`
              : "Offline — messages you send are queued until you reconnect."
          }
        />
        {outboxEntries.length > 0 ? (
          <QueuedOutboxList entries={outboxEntries} onCancel={onCancelOutbox} />
        ) : null}
      </div>
    );
  }

  if (isSyncingOutbox || outboxCount > 0) {
    return (
      <div className="mx-2 mb-2 space-y-2 sm:mx-4">
        <div
          className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground"
          role="status"
          aria-live="polite"
        >
          <span>
            {isSyncingOutbox
              ? "Sending queued messages…"
              : `${outboxCount} message${outboxCount === 1 ? "" : "s"} queued — waiting for connection`}
          </span>
          {onRetrySync ? (
            <Button type="button" size="sm" variant="secondary" onClick={onRetrySync}>
              Retry
            </Button>
          ) : null}
        </div>
        {outboxEntries.length > 0 ? (
          <QueuedOutboxList entries={outboxEntries} onCancel={onCancelOutbox} />
        ) : null}
      </div>
    );
  }

  return null;
});

function QueuedOutboxList({
  entries,
  onCancel,
}: {
  entries: OutboxEntry[];
  onCancel?: (id: string) => void;
}) {
  return (
    <ul className="space-y-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
      {entries.map((entry) => (
        <li key={entry.id} className="flex min-h-11 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-foreground">{previewOutboxContent(entry.content)}</p>
            <p className="text-xs text-muted">
              {entry.lastError ? `Failed — ${entry.lastError}` : "Queued — waiting for connection"}
            </p>
          </div>
          {onCancel ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => onCancel(entry.id)}
            >
              Cancel
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
