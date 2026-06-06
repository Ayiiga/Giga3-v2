"use client";

import { WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "giga3_dismiss_slow_network";

export function SlowNetworkBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <div className="flex items-center gap-2 border-b border-zinc-200/80 bg-zinc-50 px-3 py-1.5 text-[11px] text-zinc-600 sm:px-4 sm:text-xs">
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">
        On slow networks, replies may take a moment. Your message is still processing if
        chat stalls — wait, then try send again.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800"
        aria-label="Dismiss network tip"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
