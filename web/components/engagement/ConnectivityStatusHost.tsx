"use client";

import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { Wifi } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

/**
 * Brief "Back Online" confirmation after connectivity returns.
 * Offline banners remain in chat/GigaSocial surfaces to avoid duplicate chrome.
 */
export const ConnectivityStatusHost = memo(function ConnectivityStatusHost() {
  const { effectiveOnline } = useEffectiveOnline();
  const wasOfflineRef = useRef(false);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    if (!effectiveOnline) {
      wasOfflineRef.current = true;
      setBackOnline(false);
      return;
    }
    if (!wasOfflineRef.current) return;
    wasOfflineRef.current = false;
    setBackOnline(true);
    const timer = window.setTimeout(() => setBackOnline(false), 2800);
    return () => window.clearTimeout(timer);
  }, [effectiveOnline]);

  if (!backOnline) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[70] flex justify-center px-3"
      role="status"
      aria-live="polite"
    >
      <div className="inline-flex min-h-11 max-w-md items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-50/95 px-4 py-2 text-xs font-medium text-emerald-950 shadow-lg dark:bg-emerald-950/90 dark:text-emerald-50">
        <Wifi className="h-4 w-4 shrink-0" aria-hidden />
        <span>Back online</span>
      </div>
    </div>
  );
});
