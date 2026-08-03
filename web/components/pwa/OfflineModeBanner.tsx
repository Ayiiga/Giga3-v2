"use client";

import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { WifiOff } from "lucide-react";
import { memo } from "react";

/** Subtle offline banner — visual layer only; does not change sync/outbox logic. */
export const OfflineModeBanner = memo(function OfflineModeBanner({
  className,
  message = "Offline Mode — browsing cached content.",
}: {
  className?: string;
  message?: string;
}) {
  const { effectiveOnline } = useEffectiveOnline();
  if (effectiveOnline) return null;

  return (
    <div
      className={
        className ??
        "flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100"
      }
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  );
});
