"use client";

import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { cn } from "@/lib/utils";
import { memo } from "react";

/** Fixed-height typing row — always reserves space to prevent layout shift. */
export const ChatTypingBar = memo(function ChatTypingBar({
  visible,
}: {
  visible: boolean;
}) {
  return (
    <div
      className={cn(
        "chat-typing-bar shrink-0 border-t border-border bg-zinc-50/50 px-4 py-2 sm:px-6",
        !visible && "invisible pointer-events-none"
      )}
      aria-hidden={!visible}
    >
      <div className="chat-container">
        <div
          className={cn(
            "inline-flex min-h-[2.75rem] rounded-2xl rounded-tl-md border border-border bg-white px-4 py-2.5 shadow-subtle",
            !visible && "opacity-0"
          )}
        >
          <TypingIndicator />
        </div>
      </div>
    </div>
  );
});
