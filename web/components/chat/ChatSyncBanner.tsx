"use client";

import { OfflineModeBanner } from "@/components/pwa/OfflineModeBanner";
import { Button } from "@/components/ui/Button";
import { memo } from "react";

type ChatSyncBannerProps = {
  onRetrySync?: () => void;
  outboxCount?: number;
  isSyncingOutbox?: boolean;
  online?: boolean;
};

/**
 * Offline + outbox status. Sending while offline queues messages for sync when back online.
 */
export const ChatSyncBanner = memo(function ChatSyncBanner({
  onRetrySync,
  outboxCount = 0,
  isSyncingOutbox = false,
  online = true,
}: ChatSyncBannerProps) {
  if (online && outboxCount === 0 && !isSyncingOutbox) return null;

  if (!online) {
    return (
      <OfflineModeBanner
        message={
          outboxCount > 0
            ? `Offline — ${outboxCount} message${outboxCount === 1 ? "" : "s"} queued. They will send when you reconnect.`
            : "Offline — messages you send are queued until you reconnect."
        }
      />
    );
  }

  if (isSyncingOutbox || outboxCount > 0) {
    return (
      <div
        className="mx-2 mb-2 flex min-h-11 items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground sm:mx-4"
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
    );
  }

  return null;
});
