"use client";

import { WifiOff, X } from "lucide-react";
import { useState } from "react";

const DISMISS_KEY = "giga3_dismiss_slow_network";

type SlowNetworkTipProps = {
  message: string;
  className?: string;
};

export function SlowNetworkTip({ message, className }: SlowNetworkTipProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return true;
    }
  });

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
    <div
      className={
        className ??
        "flex items-center gap-2 border-b border-amber-200/80 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900 sm:px-4 sm:text-xs dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-100"
      }
      role="status"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">{message}</p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        aria-label="Dismiss network tip"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
