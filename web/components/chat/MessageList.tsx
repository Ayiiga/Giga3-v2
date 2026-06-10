"use client";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { DOCUMENT_TEMPLATES } from "@/lib/chat/documentTemplates";
import { GIGA3_CHAT_WELCOME } from "@/lib/assistantIdentity";
import { formatCurrentDate, resolveTemplatePlaceholders } from "@/lib/datetime";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { useScrollToLatestMessage } from "@/hooks/useScrollToLatestMessage";
import { messageListScrollKey } from "@/lib/chat/stableMessages";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, Sparkles } from "lucide-react";
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
  onRegenerate?: (messageId: string) => void;
}

const QUICK_PROMPTS = [
  "Help me draft a professional email",
  "Explain this concept simply",
  "Summarize the key points",
];

function MessageListInner({
  messages,
  isLoading = false,
  onInsertTemplate,
  onRegenerate,
}: MessageListProps) {
  useRenderDiagnostic("MessageList");

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollKey = useMemo(() => messageListScrollKey(messages), [messages]);

  useScrollToLatestMessage({
    scrollRef,
    scrollKey,
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
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div
        ref={scrollRef}
        className="message-list-scroll flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-6 sm:py-6"
      >
        {isLoading && messages.length === 0 && (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 text-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-accent/15" aria-hidden />
            <p className="text-sm text-muted">Loading messages…</p>
          </div>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="chat-rail flex h-full min-h-[14rem] flex-col items-center justify-center px-2 text-center">
            <div className="premium-card mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <MessageSquarePlus className="h-8 w-8" aria-hidden />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Welcome to Giga3 AI
            </h2>
            {todayLabel && (
              <p className="mt-1 text-sm text-muted" suppressHydrationWarning>
                {todayLabel}
              </p>
            )}
            <p className="mt-4 max-w-md text-base leading-[1.7] text-muted">
              {GIGA3_CHAT_WELCOME} Pick a template from the workspace above, or use{" "}
              <span className="font-medium text-foreground">Attach</span> to add files.
              Chats save automatically.
            </p>

            {onInsertTemplate && (
              <>
                <div className="mt-8 flex w-full flex-wrap justify-center gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => onInsertTemplate(prompt)}
                      className="min-h-11 rounded-full border border-border bg-white px-4 py-2 text-sm text-foreground shadow-sm hover:border-accent/30 hover:bg-accent/5"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <div className="mt-8 w-full">
                  <p className="mb-3 flex items-center justify-center gap-1.5 text-sm font-medium text-muted">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Document templates
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {DOCUMENT_TEMPLATES.slice(0, 6).map((template) => {
                      const Icon = template.icon;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => {
                            try {
                              onInsertTemplate(
                                resolveTemplatePlaceholders(template.body)
                              );
                            } catch {
                              /* parent handles errors via insertRef */
                            }
                          }}
                          className={cn(
                            "flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-left",
                            "text-sm text-foreground shadow-sm hover:border-accent/25 hover:bg-accent/5"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                          <span className="line-clamp-2 leading-snug">{template.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="chat-rail flex flex-col gap-4 sm:gap-6">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              id={m.id}
              role={m.role}
              content={typeof m.content === "string" ? m.content : ""}
              pending={m.id === "pending-user"}
              onRegenerate={onRegenerate}
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
    prev.onRegenerate === next.onRegenerate &&
    prev.messages === next.messages
  );
}

export const MessageList = memo(MessageListInner, propsEqual);
