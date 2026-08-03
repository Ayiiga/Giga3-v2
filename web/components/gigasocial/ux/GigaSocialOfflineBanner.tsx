"use client";

import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { WifiOff } from "lucide-react";
import { memo } from "react";

export const GigaSocialOfflineBanner = memo(function GigaSocialOfflineBanner() {
  const { effectiveOnline } = useEffectiveOnline();
  if (effectiveOnline) return null;

  return (
    <div className="gigasocial-status-banner gigasocial-status-banner--offline" role="status">
      <WifiOff className="h-4 w-4 shrink-0 text-[var(--gs-gold)]" aria-hidden />
      <p>Offline Mode — browsing cached content.</p>
    </div>
  );
});
