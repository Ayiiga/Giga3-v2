"use client";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useEffect, useRef } from "react";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: UiMessage[];
  isTyping: boolean;
}

export function MessageList({ messages, isTyping }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
      {messages.length === 0 && !isTyping && (
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-muted">
          <p className="text-lg font-medium text-foreground">Start a conversation</p>
          <p className="mt-2 max-w-sm text-sm">
            Pick a tool mode above and send a message. Your chats are saved automatically.
          </p>
        </div>
      )}
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-border bg-card">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
