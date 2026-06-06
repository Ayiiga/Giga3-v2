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
    <div className="chat-typing-bar shrink-0 border-t border-zinc-100 bg-zinc-50/40 px-3 py-2 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="inline-flex min-h-[2.75rem] rounded-2xl rounded-tl-md border border-zinc-200/90 bg-white px-4 py-2.5 shadow-sm">
          <TypingIndicator />
        </div>
      </div>
    </div>
  );
});
