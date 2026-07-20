"use client";

import { useOutboxStatus } from "@/hooks/useOutboxStatus";
import { Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { memo } from "react";

type ChatSyncBannerProps = {
  onRetrySync?: () => void;
};

export const ChatSyncBanner = memo(function ChatSyncBanner({
  onRetrySync,
}: ChatSyncBannerProps) {
  const { count, syncing } = useOutboxStatus();

  if (count === 0 && !syncing) return null;

  const label = syncing
    ? "Syncing queued messages…"
    : count === 1
      ? "1 message waiting to send"
      : `${count} messages waiting to send`;

  return (
    <div
      className="flex items-center gap-2 border-b border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100 sm:text-sm"
      role="status"
    >
      {syncing ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <UploadCloud className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <p className="min-w-0 flex-1 leading-snug">{label}</p>
      {!syncing && onRetrySync && (
        <button
          type="button"
          onClick={onRetrySync}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-sky-100 hover:bg-sky-500/20 sm:text-xs"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Retry
        </button>
      )}
    </div>
  );
});
