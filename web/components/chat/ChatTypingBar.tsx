"use client";

import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { cn } from "@/lib/utils";
import { Square } from "lucide-react";
import { memo } from "react";

/** Fixed-height typing row — always reserved so layout does not jump. */
export const ChatTypingBar = memo(function ChatTypingBar({
  visible,
  slowNetwork = false,
  onStop,
}: {
  visible: boolean;
  slowNetwork?: boolean;
  onStop?: () => void;
}) {
  return (
    <div
      className={cn(
        "chat-typing-bar shrink-0 bg-background px-3 py-2 sm:px-6",
        !visible && "hidden"
      )}
      aria-hidden={!visible}
    >
      <div className="chat-rail flex items-center justify-between gap-3">
        <div className="inline-flex min-h-11 items-center rounded-2xl px-1 py-1">
          {visible ? <TypingIndicator slowNetwork={slowNetwork} /> : null}
        </div>
        {visible && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:bg-card"
            aria-label="Stop generating"
          >
            <Square className="h-3 w-3 fill-current" aria-hidden />
            Stop
          </button>
        ) : null}
      </div>
    </div>
  );
});
