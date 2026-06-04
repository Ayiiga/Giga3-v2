"use client";

import { memo } from "react";

interface TypingIndicatorProps {
  showNetworkHint?: boolean;
}

/** Static typing indicator — no timers (avoids 1Hz re-renders that shake the chat column). */
function TypingIndicatorInner({ showNetworkHint = true }: TypingIndicatorProps) {
  return (
    <div className="px-1 py-1" aria-live="polite" aria-label="Assistant is typing">
      <div className="flex items-center gap-2">
        <span className="inline-flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-cyan-500 opacity-90" />
          <span className="h-2 w-2 rounded-full bg-cyan-500 opacity-70" />
          <span className="h-2 w-2 rounded-full bg-cyan-500 opacity-50" />
        </span>
        <span className="text-sm font-medium text-zinc-700">Thinking…</span>
      </div>
      {showNetworkHint && (
        <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-muted">
          On slower networks this can take up to a minute. Keep this tab open.
        </p>
      )}
    </div>
  );
}

export const TypingIndicator = memo(TypingIndicatorInner);
