"use client";

import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { WifiOff } from "lucide-react";
import { memo } from "react";

export const GigaSocialOfflineBanner = memo(function GigaSocialOfflineBanner() {
  const online = useEffectiveOnline();
  if (online) return null;

  return (
    <div className="gigasocial-status-banner gigasocial-status-banner--offline" role="status">
      <WifiOff className="h-4 w-4 shrink-0 text-[var(--gs-gold)]" aria-hidden />
      <p>
        You&apos;re offline. Browsing cached content.
      </p>
    </div>
  );
});
