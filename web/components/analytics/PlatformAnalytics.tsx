"use client";

import { getOrCreateClientId, isStandalonePwa } from "@/lib/analytics/clientId";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect } from "react";

const HEARTBEAT_MS = 45_000;
const PWA_INSTALL_KEY = "giga3_pwa_install_reported";

/** Presence + PWA install telemetry for platform insights. */
export function PlatformAnalytics() {
  const heartbeat = useMutation(api.platformStats.heartbeat);
  const recordPwaInstall = useMutation(api.platformStats.recordPwaInstall);

  useEffect(() => {
    const clientId = getOrCreateClientId();
    const isPwa = isStandalonePwa();

    const sendHeartbeat = () => {
      void heartbeat({
        clientId,
        isPwa,
        sessionToken: getSessionToken() ?? undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }).catch(() => null);
    };

    const reportInstall = () => {
      try {
        if (localStorage.getItem(PWA_INSTALL_KEY)) return;
        localStorage.setItem(PWA_INSTALL_KEY, "1");
      } catch {
        /* ignore */
      }
      void recordPwaInstall({
        clientId,
        sessionToken: getSessionToken() ?? undefined,
      }).catch(() => null);
    };

    sendHeartbeat();
    if (isPwa) reportInstall();

    const onInstalled = () => reportInstall();
    window.addEventListener("appinstalled", onInstalled);

    const timer = window.setInterval(sendHeartbeat, HEARTBEAT_MS);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.clearInterval(timer);
    };
  }, [heartbeat, recordPwaInstall]);

  return null;
}
