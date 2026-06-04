"use client";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { DOCUMENT_TEMPLATES } from "@/lib/chat/documentTemplates";
import { formatCurrentDate, resolveTemplatePlaceholders } from "@/lib/datetime";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { useScrollToLatestMessage } from "@/hooks/useScrollToLatestMessage";
import { memo, useMemo, useRef } from "react";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: UiMessage[];
  isLoading?: boolean;
  onInsertTemplate?: (text: string) => void;
}

function MessageListInner({
  messages,
  isLoading = false,
  onInsertTemplate,
}: MessageListProps) {
  useRenderDiagnostic("MessageList");

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages[messages.length - 1]?.id;

  useScrollToLatestMessage({
    scrollRef,
    lastMessageId,
    enabled: messages.length > 0,
  });

  const todayLabel = useMemo(() => {
    try {
      return formatCurrentDate();
    } catch {
      return "";
    }
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="message-list-scroll flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-6"
      >
        {isLoading && messages.length === 0 && (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-muted">
            <p className="text-xl font-bold text-foreground">Loading messages…</p>
          </div>
        )}
        {messages.length === 0 && !isLoading && (
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
                      className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-xs hover:border-accent/40 hover:bg-accent/5"
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
        </div>
      </div>
    </div>
  );
}

function propsEqual(prev: MessageListProps, next: MessageListProps): boolean {
  return (
    prev.isLoading === next.isLoading &&
    prev.onInsertTemplate === next.onInsertTemplate &&
    prev.messages === next.messages
  );
}

export const MessageList = memo(MessageListInner, propsEqual);
