"use client";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
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
  isTyping: boolean;
  onInsertTemplate?: (text: string) => void;
}

export function MessageList({
  messages,
  isTyping,
  onInsertTemplate,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const todayLabel = (() => {
    try {
      return formatCurrentDate();
    } catch {
      return "";
    }
  })();

  return (
    <PullToRefresh
      onRefresh={refreshApp}
      scrollRef={scrollRef}
      className="flex min-h-0 flex-1 flex-col"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-6"
      >
        {messages.length === 0 && !isTyping && (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-muted">
            <p className="text-lg font-medium text-foreground">Start a conversation</p>
            {todayLabel && (
              <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
                {todayLabel}
              </p>
            )}
            <p className="mt-2 max-w-sm text-sm">
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
                      className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-xs transition-all hover:border-accent/40 hover:bg-accent/5"
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
            />
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
    </PullToRefresh>
  );
}
