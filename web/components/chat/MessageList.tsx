"use client";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ChatLoadingSkeleton } from "@/components/chat/ChatLoadingSkeleton";
import { DOCUMENT_TEMPLATES } from "@/lib/chat/documentTemplates";
import { formatCurrentDate, resolveTemplatePlaceholders } from "@/lib/datetime";
import { PullToRefresh } from "@/components/pwa/PullToRefresh";
import { refreshApp } from "@/lib/refresh";
import { useEffect, useRef } from "react";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: UiMessage[];
  isLoading?: boolean;
  isTyping: boolean;
  onInsertTemplate?: (text: string) => void;
}

export function MessageList({
  messages,
  isLoading = false,
  isTyping,
  onInsertTemplate,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageCountRef = useRef(0);
  const wasTypingRef = useRef(false);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    const countChanged = messages.length !== messageCountRef.current;
    const typingStarted = isTyping && !wasTypingRef.current;

    if (countChanged || typingStarted) {
      el.scrollIntoView({ behavior: "auto", block: "end" });
    }

    messageCountRef.current = messages.length;
    wasTypingRef.current = isTyping;
  }, [messages, isTyping]);

  const todayLabel = (() => {
    try {
      return formatCurrentDate();
    } catch {
      return "";
    }
  })();

  if (isLoading && messages.length === 0) {
    return <ChatLoadingSkeleton />;
  }

  return (
    <PullToRefresh
      onRefresh={refreshApp}
      scrollRef={scrollRef}
      className="flex min-h-0 flex-1 flex-col"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div
        ref={scrollRef}
        data-chat-scroll
        className="flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 [-webkit-overflow-scrolling:touch] sm:px-6"
      >
        {messages.length === 0 && !isTyping && (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-muted">
            <p className="text-xl font-bold text-foreground">Start a conversation</p>
            {todayLabel && (
              <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
                {todayLabel}
              </p>
            )}
            <p className="mt-2 max-w-sm text-base font-medium text-foreground">
              Pick an AI mode, choose a professional template, or attach files below. Chats
              save automatically.
            </p>
            {onInsertTemplate && (
              <div className="mt-6 grid w-full max-w-lg grid-cols-2 gap-2 px-2 sm:grid-cols-3">
                {DOCUMENT_TEMPLATES.slice(0, 6).map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        try {
                          onInsertTemplate(resolveTemplatePlaceholders(template.body));
                        } catch {
                          /* parent handles errors via insertRef */
                        }
                      }}
                      className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-xs hover:border-accent/40 hover:bg-accent/5 pointer-fine:transition-colors"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                      <span className="font-medium text-foreground">{template.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={typeof m.content === "string" ? m.content : ""}
              pending={m.id === "pending-user"}
            />
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
        </div>
      </div>
    </PullToRefresh>
  );
}
