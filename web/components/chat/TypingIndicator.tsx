"use client";

import {
  CHAT_LOADING_STAGE_BOUNDARIES,
  CHAT_REPLYING_STAGE_BOUNDARIES,
  chatLoadingStageLabel,
  type ChatLoadingPhase,
} from "@/lib/chat/loadingStatus";
import { useEffect, useState } from "react";

/**
 * Typing indicator with subtle pulse (respects reduced motion via CSS).
 * Sending phase: Connecting → Sending → Waiting (never "Generating…").
 * Replying phase: progressive labels so long 3G waits never look frozen.
 */
export function TypingIndicator({
  slowNetwork = false,
  phase = "replying",
}: {
  slowNetwork?: boolean;
  phase?: ChatLoadingPhase;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = Date.now();
    setElapsedMs(0);
    const boundaries =
      phase === "replying"
        ? CHAT_REPLYING_STAGE_BOUNDARIES
        : CHAT_LOADING_STAGE_BOUNDARIES;
    const timers = boundaries.map((boundary) =>
      setTimeout(() => setElapsedMs(Date.now() - start), boundary + 30)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const label = chatLoadingStageLabel(elapsedMs, slowNetwork, phase);

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
