"use client";

import {
  invalidateReachabilityCache,
  probeConvexReachability,
} from "@/lib/network/reachability";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCallback, useEffect, useState } from "react";

const PROBE_INTERVAL_MS = 30_000;

/**
 * Combines navigator.onLine with Convex reachability probes.
 * Returns effectiveOnline=false when the browser is offline or the backend is unreachable.
 */
export function useEffectiveOnline() {
  const browserOnline = useOnlineStatus();
  const [reachable, setReachable] = useState(true);
  const [probing, setProbing] = useState(false);

  const runProbe = useCallback(async () => {
    if (!browserOnline) {
      setReachable(false);
      return false;
    }
    setProbing(true);
    try {
      const ok = await probeConvexReachability();
      setReachable(ok);
      return ok;
    } finally {
      setProbing(false);
    }
  }, [browserOnline]);

  useEffect(() => {
    if (!browserOnline) {
      setReachable(false);
      return;
    }
    invalidateReachabilityCache();
    void runProbe();
  }, [browserOnline, runProbe]);

  useEffect(() => {
    if (!browserOnline) return;
    const interval = window.setInterval(() => {
      invalidateReachabilityCache();
      void runProbe();
    }, PROBE_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        invalidateReachabilityCache();
        void runProbe();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [browserOnline, runProbe]);

  const effectiveOnline = browserOnline && reachable;

  return {
    browserOnline,
    reachable,
    effectiveOnline,
    probing,
    refresh: runProbe,
  };
}
