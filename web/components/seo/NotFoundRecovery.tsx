"use client";

import { clearCachesAndReload } from "@/lib/pwa/pwaRecovery";
import { useEffect, useState } from "react";

interface NotFoundRecoveryProps {
  /** Optional extra actions rendered below recovery button. */
  children?: React.ReactNode;
}

/**
 * Client-only 404 diagnostics + safe cache recovery.
 * Avoids GPU-heavy effects — plain buttons only (marketing-stable parent).
 */
export function NotFoundRecovery({ children }: NotFoundRecoveryProps) {
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname + window.location.search;
    const ref = document.referrer || "";
    try {
      void fetch(
        `/api/log-404?path=${encodeURIComponent(path)}&ref=${encodeURIComponent(ref)}`,
        { method: "GET", keepalive: true, cache: "no-store" }
      );
    } catch {
      /* ignore */
    }
  }, []);

  async function handleClearCache() {
    setRecovering(true);
    await clearCachesAndReload("/");
  }

  return (
    <div className="mt-8 border-t border-border pt-6 text-center">
      {children}
      <p className="text-xs text-muted">
        Seeing glitches or a blank screen after an update?
      </p>
      <button
        type="button"
        disabled={recovering}
        onClick={() => void handleClearCache()}
        className="mt-2 inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-muted hover:bg-accent/10 hover:text-foreground disabled:opacity-60"
      >
        {recovering ? "Refreshing…" : "Clear app cache & reload"}
      </button>
      <p className="mt-2 text-[11px] text-muted">
        Keeps your sign-in — only clears outdated cached files.
      </p>
    </div>
  );
}
