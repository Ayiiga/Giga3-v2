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
    <div className="chat-typing-bar shrink-0 border-t border-zinc-100 bg-white px-3 py-2 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="inline-flex min-h-[52px] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <TypingIndicator />
        </div>
      </div>
    </div>
  );
});
