"use client";

import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { useOutboxStatus } from "@/hooks/useOutboxStatus";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { Loader2, WifiOff } from "lucide-react";

export function OfflineBanner() {
  const { browserOnline, effectiveOnline, probing } = useEffectiveOnline();
  const { isSlowNetwork } = useConnectionQuality();
  const { count, syncing } = useOutboxStatus();

  if (browserOnline && effectiveOnline && !syncing && count === 0) {
    return null;
  }

  if (browserOnline && effectiveOnline && syncing) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-950/90 px-4 py-3 text-sm text-sky-100 shadow-lg sm:left-auto"
        role="status"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        Syncing {count === 1 ? "1 queued message" : `${count} queued messages`}…
      </div>
    );
  }

  if (browserOnline && !effectiveOnline) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/90 px-4 py-3 text-sm text-amber-100 shadow-lg sm:left-auto"
        role="status"
      >
        {probing ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {probing
          ? "Checking connection…"
          : "Connection unstable — messages will queue until the server is reachable."}
      </div>
    );
  }

  if (!browserOnline) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/90 px-4 py-3 text-sm text-amber-100 shadow-lg sm:left-auto"
        role="status"
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          You&apos;re offline.
          {count > 0
            ? ` ${count} message${count === 1 ? "" : "s"} queued — will send when you reconnect.`
            : " Cached pages and conversations stay available."}
          {isSlowNetwork ? " Using low-bandwidth mode." : ""}
        </span>
      </div>
    );
  }

  if (count > 0) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-950/90 px-4 py-3 text-sm text-sky-100 shadow-lg sm:left-auto"
        role="status"
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        {count === 1
          ? "1 message queued — will send when connection improves."
          : `${count} messages queued — will send when connection improves.`}
      </div>
    );
  }

  return null;
}
