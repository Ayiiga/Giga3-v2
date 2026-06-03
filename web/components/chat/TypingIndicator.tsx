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

  return (
    <div className="px-4 py-3" aria-live="polite" aria-label="Assistant is typing">
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:300ms]" />
        <span className="ml-2 text-xs text-muted">
          Thinking{seconds > 0 ? ` · ${seconds}s` : "…"}
        </span>
      </div>
      {showNetworkHint && seconds >= 8 && (
        <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-muted">
          Still working — on slower mobile networks this can take up to a minute.
          Keep this tab open; you can send again if it fails.
        </p>
      )}
    </div>
  );
}
