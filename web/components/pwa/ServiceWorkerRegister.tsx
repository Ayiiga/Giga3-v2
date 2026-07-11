"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let interval: ReturnType<typeof setInterval> | undefined;

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
      if (interval) window.clearInterval(interval);
    };
  }, []);

  return null;
}
