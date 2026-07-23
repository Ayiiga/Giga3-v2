"use client";

import { getConvexUrl } from "@/lib/convex";

/** Generous timeout — 3G/H+ often needs >6s; aborting early caused false offline. */
const PROBE_TIMEOUT_MS = 14_000;
const PROBE_CACHE_MS = 20_000;

let lastProbeAt = 0;
let lastProbeResult = true;
let probeInFlight: Promise<boolean> | null = null;

/** Lightweight Convex reachability check — detects "lie-fi" when browser reports online. */
export async function probeConvexReachability(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    lastProbeResult = false;
    lastProbeAt = Date.now();
    return false;
  }

  const now = Date.now();
  if (now - lastProbeAt < PROBE_CACHE_MS) {
    return lastProbeResult;
  }

  if (probeInFlight) return probeInFlight;

  probeInFlight = (async () => {
    const convexUrl = getConvexUrl();
    if (!convexUrl) {
      lastProbeResult = true;
      lastProbeAt = Date.now();
      return true;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(`${convexUrl.replace(/\/$/, "")}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "remoteConfig:getRemoteConfig",
          args: { userId: undefined },
          format: "json",
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      lastProbeResult = res.ok;
      lastProbeAt = Date.now();
      return lastProbeResult;
    } catch {
      lastProbeResult = false;
      lastProbeAt = Date.now();
      return false;
    } finally {
      clearTimeout(timer);
      probeInFlight = null;
    }
  })();

  return probeInFlight;
}

export function invalidateReachabilityCache(): void {
  lastProbeAt = 0;
}
