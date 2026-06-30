"use client";

import { Button } from "@/components/ui/Button";
import { RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SwUpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let mounted = true;

    navigator.serviceWorker.ready.then((registration) => {
      if (!mounted) return;

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            waitingRef.current = worker;
            setVisible(true);
          }
        });
      });

      if (registration.waiting && navigator.serviceWorker.controller) {
        waitingRef.current = registration.waiting;
        setVisible(true);
      }
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg sm:left-auto"
    >
      <p className="text-sm text-foreground">
        A new version of Giga3 is ready.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            const worker = waitingRef.current;
            if (worker) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
            setVisible(false);
          }}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
          Update
        </Button>
        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-accent/10"
          aria-label="Dismiss update notice"
          onClick={() => setVisible(false)}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
