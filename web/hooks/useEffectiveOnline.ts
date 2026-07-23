"use client";

import {
  invalidateReachabilityCache,
  probeConvexReachability,
} from "@/lib/network/reachability";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCallback, useEffect, useRef, useState } from "react";

const PROBE_INTERVAL_MS = 45_000;
/** Require consecutive probe failures before treating the backend as down (3G lie-fi). */
const FAILURES_BEFORE_OFFLINE = 2;

/**
 * Combines navigator.onLine with Convex reachability probes.
 * Stays optimistic on flaky mobile networks — a single slow probe must not
 * flip the app into "offline" / queue-only mode.
 */
export function useEffectiveOnline() {
  const browserOnline = useOnlineStatus();
  const [reachable, setReachable] = useState(true);
  const [probing, setProbing] = useState(false);
  const failStreakRef = useRef(0);

  const runProbe = useCallback(async () => {
    if (!browserOnline) {
      failStreakRef.current = FAILURES_BEFORE_OFFLINE;
      setReachable(false);
      return false;
    }
    setProbing(true);
    try {
      const ok = await probeConvexReachability();
      if (ok) {
        failStreakRef.current = 0;
        setReachable(true);
        return true;
      }
      failStreakRef.current += 1;
      if (failStreakRef.current >= FAILURES_BEFORE_OFFLINE) {
        setReachable(false);
      }
      return false;
    } finally {
      setProbing(false);
    }
  }, [browserOnline]);

  useEffect(() => {
    if (!browserOnline) {
      failStreakRef.current = FAILURES_BEFORE_OFFLINE;
      setReachable(false);
      return;
    }
    // Browser came back online — assume reachable until probes prove otherwise.
    failStreakRef.current = 0;
    setReachable(true);
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
