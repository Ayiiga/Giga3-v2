"use client";

import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { SwUpdatePrompt } from "@/components/pwa/SwUpdatePrompt";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const InstallPrompt = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/pwa/InstallPrompt").then((module) => ({
      default: module.InstallPrompt,
    }))
  ),
  { ssr: false }
);

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
      <InstallPrompt />
      <OfflineBanner />
    </>
  );
}
