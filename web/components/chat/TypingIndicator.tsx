"use client";

import {
  CHAT_LOADING_STAGE_BOUNDARIES,
  chatLoadingStageLabel,
} from "@/lib/chat/loadingStatus";
import { useEffect, useState } from "react";

/**
 * Typing indicator with subtle pulse (respects reduced motion via CSS).
 * Shows a staged status (Connecting… → Waiting for Giga3… → Generating response…)
 * so the user always sees progress instead of a frozen "Thinking…".
 *
 * Re-renders only at the few stage boundaries (not every frame) to keep the
 * chat layout stable — see AGENTS.md "static TypingIndicator" note.
 */
export function TypingIndicator({ slowNetwork = false }: { slowNetwork?: boolean }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timers = CHAT_LOADING_STAGE_BOUNDARIES.map((boundary) =>
      setTimeout(() => setElapsedMs(Date.now() - start), boundary + 30)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const label = chatLoadingStageLabel(elapsedMs, slowNetwork);

  return (
    <div
      className="min-h-[24px]"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1" aria-hidden>
          <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
          <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
          <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
        </span>
        <span className="text-sm font-medium text-muted">{label}</span>
      </div>
    </div>
  );
}
