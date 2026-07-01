"use client";

import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { cn } from "@/lib/utils";
import { memo } from "react";

/** Fixed-height typing row — always reserved so isSending does not shrink the message list. */
export const ChatTypingBar = memo(function ChatTypingBar({
  visible,
  slowNetwork = false,
}: {
  visible: boolean;
  slowNetwork?: boolean;
}) {
  return (
    <div
      className={cn(
        "chat-typing-bar shrink-0 bg-background px-3 py-2 sm:px-6",
        !visible && "hidden"
      )}
      aria-hidden={!visible}
    >
      <div className="chat-rail">
        <div className="inline-flex min-h-11 items-center rounded-2xl px-1 py-1">
          {visible ? <TypingIndicator slowNetwork={slowNetwork} /> : null}
        </div>
      </div>
    </div>
  );
});
