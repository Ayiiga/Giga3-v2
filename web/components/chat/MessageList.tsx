"use client";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { DOCUMENT_TEMPLATES } from "@/lib/chat/documentTemplates";
import { GIGA3_CHAT_WELCOME } from "@/lib/assistantIdentity";
import { formatCurrentDate, resolveTemplatePlaceholders } from "@/lib/datetime";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { useScrollToLatestMessage } from "@/hooks/useScrollToLatestMessage";
import { ScrollToLatestButton } from "@/components/chat/ScrollToLatestButton";
import { messageListScrollKey } from "@/lib/chat/stableMessages";
import { groupMessagesByDate } from "@/lib/chat/groupMessagesByDate";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, Sparkles } from "lucide-react";
import { memo, useMemo, useRef } from "react";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
}

interface MessageListProps {
  messages: UiMessage[];
  isLoading?: boolean;
  isSending?: boolean;
  streamingMessageId?: string | null;
  onInsertTemplate?: (text: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
}

const QUICK_PROMPTS = [
  "Help me draft a professional email",
  "Explain this concept simply",
  "Summarize the key points",
];

function MessageListInner({
  messages,
  isLoading = false,
  isSending = false,
  onInsertTemplate,
  onRegenerate,
  onEditMessage,
}: MessageListProps) {
  useRenderDiagnostic("MessageList");

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollKey = useMemo(() => messageListScrollKey(messages), [messages]);
  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages]);
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  const { showScrollButton, scrollToLatest } = useScrollToLatestMessage({
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
    <div className="chat-message-list relative min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-hidden bg-background">
      <div
        ref={scrollRef}
        className="message-list-scroll chat-message-scroll-region overscroll-y-contain py-3 sm:py-6"
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

        <div className="chat-thread chat-message-stack flex w-full min-w-0 max-w-full flex-col gap-3 sm:gap-6">
          {messageGroups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <div className="chat-date-divider my-2 flex items-center gap-3 px-2 sm:px-0">
                <span className="h-px flex-1 bg-border" aria-hidden />
                <span className="text-xs font-medium text-muted">{group.label}</span>
                <span className="h-px flex-1 bg-border" aria-hidden />
              </div>
              <div className="flex flex-col gap-3 sm:gap-6">
                {group.messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    id={m.id}
                    role={m.role}
                    content={typeof m.content === "string" ? m.content : ""}
                    createdAt={m.createdAt}
                    pending={m.id === "pending-user"}
                    streaming={
                      m.role === "assistant" &&
                      m.id === lastAssistantId &&
                      m.id !== "pending-user"
                    }
                    onRegenerate={onRegenerate}
                    onEdit={onEditMessage}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <ScrollToLatestButton visible={showScrollButton} onClick={scrollToLatest} />
    </div>
  );
}

function propsEqual(prev: MessageListProps, next: MessageListProps): boolean {
  return (
    prev.isLoading === next.isLoading &&
    prev.isSending === next.isSending &&
    prev.onInsertTemplate === next.onInsertTemplate &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onEditMessage === next.onEditMessage &&
    prev.messages === next.messages
  );
}

export const MessageList = memo(MessageListInner, propsEqual);
