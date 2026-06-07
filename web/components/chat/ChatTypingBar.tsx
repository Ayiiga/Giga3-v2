"use client";

import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { memo } from "react";

/** Fixed-height typing row — outside MessageList so isSending does not re-render messages. */
export const ChatTypingBar = memo(function ChatTypingBar({
  visible,
}: {
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="chat-typing-bar shrink-0 border-t border-border bg-white px-4 py-2 sm:px-6">
      <div className="chat-rail">
        <div className="inline-flex min-h-11 items-center rounded-2xl px-1 py-1">
          <TypingIndicator />
        </div>
      </div>
    </div>
  );
});
