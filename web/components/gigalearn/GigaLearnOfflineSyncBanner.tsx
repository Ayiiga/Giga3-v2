"use client";

import { Button } from "@/components/ui/Button";
import type { GigaLearnOfflineSyncUiState } from "@/hooks/useGigaLearnOfflineProgressSync";
import { memo } from "react";

type GigaLearnOfflineSyncBannerProps = {
  pendingCount: number;
  syncState: GigaLearnOfflineSyncUiState;
  lastError?: string | null;
  onRetry?: () => void;
};

export const GigaLearnOfflineSyncBanner = memo(function GigaLearnOfflineSyncBanner({
  pendingCount,
  syncState,
  lastError,
  onRetry,
}: GigaLearnOfflineSyncBannerProps) {
  if (pendingCount === 0 && syncState !== "failed" && syncState !== "synced") return null;

  let message = "";
  if (syncState === "syncing") {
    message = "Syncing offline progress…";
  } else if (syncState === "synced" && pendingCount === 0) {
    message = "Offline progress synced.";
  } else if (syncState === "failed") {
    message =
      lastError ??
      `${pendingCount} progress event${pendingCount === 1 ? "" : "s"} waiting to sync.`;
  } else if (pendingCount > 0) {
    message = `${pendingCount} progress event${pendingCount === 1 ? "" : "s"} pending sync.`;
  }

  if (!message) return null;

  return (
    <div
      className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground"
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      {onRetry && (syncState === "failed" || syncState === "pending") ? (
        <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
});
