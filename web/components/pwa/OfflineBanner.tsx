"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/90 px-4 py-3 text-sm text-amber-100 shadow-lg sm:left-auto"
      role="status"
    >
      <WifiOff className="app-icon" aria-hidden />
      You&apos;re offline. Cached pages and assets remain available.
    </div>
  );
}
