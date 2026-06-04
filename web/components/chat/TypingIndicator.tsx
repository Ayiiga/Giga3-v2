"use client";

import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  /** Show guidance for high-latency / mobile networks (e.g. Africa). */
  showNetworkHint?: boolean;
}

export function TypingIndicator({ showNetworkHint = true }: TypingIndicatorProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const showHint = showNetworkHint && seconds >= 8;

  return (
    <div
      className="min-h-[28px]"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-cyan-500 opacity-90" />
          <span className="h-2 w-2 rounded-full bg-cyan-500 opacity-70" />
          <span className="h-2 w-2 rounded-full bg-cyan-500 opacity-50" />
        </span>
        <span className="text-sm font-medium text-zinc-700">
          Thinking{seconds > 0 ? ` · ${seconds}s` : "…"}
        </span>
      </div>
      <p
        className={
          showHint
            ? "mt-2 max-w-sm text-[11px] leading-relaxed text-muted"
            : "mt-2 max-h-0 overflow-hidden text-[11px] opacity-0"
        }
        aria-hidden={!showHint}
      >
        Still working — on slower mobile networks this can take up to a minute.
        Keep this tab open; you can send again if it fails.
      </p>
    </div>
  );
}
