"use client";

import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { getFeedSnapshotSavedAt } from "@/lib/gigasocial/feedOfflineSnapshot";
import { WifiOff } from "lucide-react";
import { memo, useEffect, useState } from "react";

export const GigaSocialOfflineBanner = memo(function GigaSocialOfflineBanner() {
  const { effectiveOnline } = useEffectiveOnline();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (effectiveOnline) {
      setSavedAt(null);
      return;
    }
    setSavedAt(getFeedSnapshotSavedAt());
  }, [effectiveOnline]);

  if (effectiveOnline) return null;

  const cachedLabel =
    savedAt != null
      ? `Cached ${new Date(savedAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}`
      : "Previously loaded posts only";

  return (
    <div className="gigasocial-status-banner gigasocial-status-banner--offline" role="status">
      <WifiOff className="h-4 w-4 shrink-0 text-[var(--gs-gold)]" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">Offline — viewing cached feed</p>
        <p className="text-[11px] opacity-90">
          {cachedLabel}. Likes and posts queue until you reconnect.
        </p>
      </div>
    </div>
  );
});
