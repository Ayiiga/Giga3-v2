"use client";

import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { cn } from "@/lib/utils";
import { memo } from "react";

/** Fixed-height typing row — always reserved so isSending does not shrink the message list. */
export const ChatTypingBar = memo(function ChatTypingBar({
  visible,
}: {
  visible: boolean;
}) {
  return (
    <div
      className={cn(
        "chat-typing-bar shrink-0 border-t border-border bg-white px-4 py-2 sm:px-6",
        !visible && "invisible pointer-events-none"
      )}
      aria-hidden={!visible}
    >
      <div className="chat-rail">
        <div className="inline-flex min-h-11 items-center rounded-2xl px-1 py-1">
          {visible ? <TypingIndicator /> : null}
        </div>
      </div>
    </div>
  );
});
