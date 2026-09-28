"use client";

import { recoverFromServiceWorkerStaleChunk } from "@/lib/pwa/chunkLoadRecovery";
import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let interval: ReturnType<typeof setInterval> | undefined;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "GIGA3_CHUNK_STALE") {
        recoverFromServiceWorkerStaleChunk();
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        void registration.update();
        interval = window.setInterval(() => {
          void registration.update();
        }, 15 * 60 * 1000);
      })
      .catch((err) => {
        console.warn("SW registration failed", err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      if (interval) window.clearInterval(interval);
    };
  }, []);

  return null;
}
