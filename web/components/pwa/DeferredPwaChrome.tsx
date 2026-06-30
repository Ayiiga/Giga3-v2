"use client";

import { GlobalSlowNetworkBanner } from "@/components/pwa/GlobalSlowNetworkBanner";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { SwUpdatePrompt } from "@/components/pwa/SwUpdatePrompt";
import { useEffect, useState } from "react";

/** Defers non-critical PWA UI until after first paint / idle time. */
export function DeferredPwaChrome() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const show = () => setReady(true);
    const idle = window.requestIdleCallback?.(show, { timeout: 2500 });
    if (idle === undefined) {
      const timer = window.setTimeout(show, 1200);
      return () => window.clearTimeout(timer);
    }
    return () => window.cancelIdleCallback?.(idle);
  }, []);

  if (!ready) return null;

  return (
    <>
      <SwUpdatePrompt />
      <GlobalSlowNetworkBanner />
      <OfflineBanner />
    </>
  );
}
