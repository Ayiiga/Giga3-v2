"use client";

import { MessageBubble } from "@/components/chat/MessageBubble";
import type { DocumentTemplateId } from "@/lib/chat/documentTemplates";
import { getCategoryForMode } from "@/lib/chat/chatCategories";
import { watchLocalDay } from "@/lib/chat/dailyChat";
import { getDailySuggestedPrompts, getSuggestedPrompts } from "@/lib/chat/suggestedPrompts";
import { GIGA3_CHAT_WELCOME } from "@/lib/assistantIdentity";
import type { AiModeId } from "@/lib/aiRouter";
import { formatCurrentDate } from "@/lib/datetime";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { useScrollToLatestMessage } from "@/hooks/useScrollToLatestMessage";
import { ScrollToLatestButton } from "@/components/chat/ScrollToLatestButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { messageListScrollKey } from "@/lib/chat/stableMessages";
import { groupMessagesByDate } from "@/lib/chat/groupMessagesByDate";
import { memo, useEffect, useMemo, useRef, useState } from "react";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
  metadataJson?: string;
}

interface MessageListProps {
  messages: UiMessage[];
  mode?: AiModeId;
  isLoading?: boolean;
  isSending?: boolean;
  isAcceptingMessage?: boolean;
  awaitingReply?: boolean;
  onInsertTemplate?: (text: string) => void;
  onSelectDocumentTemplate?: (templateId: DocumentTemplateId) => void;
  onRegenerate?: (messageId: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

const QUICK_PROMPTS_FALLBACK = [
  "Help me draft a professional email",
  "Explain this concept simply",
  "Summarize the key points",
];

function MessageListInner({
  messages,
  mode = "general",
  isLoading = false,
  isSending = false,
  isAcceptingMessage = false,
  awaitingReply = false,
  onInsertTemplate,
  onRegenerate,
  onEditMessage,
  onDeleteMessage,
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

  const category = useMemo(() => getCategoryForMode(mode), [mode]);
  const [dayKey, setDayKey] = useState<string | null>(null);
  useEffect(() => watchLocalDay(setDayKey), []);
  const suggestedPrompts = useMemo(
    () =>
      dayKey
        ? getDailySuggestedPrompts(mode, 3, dayKey)
        : getSuggestedPrompts(mode, 3),
    [mode, dayKey]
  );

  return (
    <div className="chat-message-list relative min-h-0 min-w-0 max-w-full overflow-x-clip overflow-y-hidden bg-background">
      <div
        ref={scrollRef}
        className="message-list-scroll chat-message-scroll-region overscroll-y-contain py-3 sm:py-6"
      >
        {isLoading && messages.length === 0 && (
          <LoadingState label="Loading messages…" className="h-full min-h-[12rem]" />
        )}

        {messages.length === 0 && !isLoading && (
          <div className="chat-rail flex w-full flex-col items-center px-2 pt-8 text-center">
            <h2 className="chat-welcome-title text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Welcome to Giga3 AI
            </h2>
            <p className="mt-2 text-sm font-semibold tracking-wide text-accent">
              {category.emoji} {category.label} mode
            </p>
            {todayLabel && (
              <p className="mt-1 text-sm text-muted" suppressHydrationWarning>
                {todayLabel}
              </p>
            )}
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
              {GIGA3_CHAT_WELCOME} Type a message below. Open Workspace when you want a template.
            </p>

            {onInsertTemplate && (
              <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
                {(suggestedPrompts.length > 0 ? suggestedPrompts : QUICK_PROMPTS_FALLBACK.map((prompt) => ({
                  label: prompt,
                  text: prompt,
                }))).map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => onInsertTemplate(prompt.text)}
                    className="min-h-11 rounded-full border border-border bg-white px-4 py-2 text-sm text-foreground shadow-sm hover:border-accent/30 hover:bg-accent/5"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="chat-thread chat-message-stack flex w-full min-w-0 max-w-full flex-col gap-4 sm:gap-5">
          {messageGroups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <div className="chat-date-divider my-2 flex items-center gap-3 px-2 sm:px-0">
                <span className="h-px flex-1 bg-border" aria-hidden />
                <span className="text-xs font-medium text-muted">{group.label}</span>
                <span className="h-px flex-1 bg-border" aria-hidden />
              </div>
              <div className="flex flex-col gap-4 sm:gap-5">
                {group.messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    id={m.id}
                    role={m.role}
                    content={typeof m.content === "string" ? m.content : ""}
                    metadataJson={m.metadataJson}
                    createdAt={m.createdAt}
                    pending={m.id === "pending-user"}
                    showSending={false}
                    streaming={
                      awaitingReply &&
                      m.role === "assistant" &&
                      m.id === lastAssistantId &&
                      m.id !== "pending-user"
                    }
                    onRegenerate={onRegenerate}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
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
    prev.mode === next.mode &&
    prev.isLoading === next.isLoading &&
    prev.isSending === next.isSending &&
    prev.isAcceptingMessage === next.isAcceptingMessage &&
    prev.awaitingReply === next.awaitingReply &&
    prev.onInsertTemplate === next.onInsertTemplate &&
    prev.onSelectDocumentTemplate === next.onSelectDocumentTemplate &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onEditMessage === next.onEditMessage &&
    prev.onDeleteMessage === next.onDeleteMessage &&
    prev.messages === next.messages
  );
}

export const MessageList = memo(MessageListInner, propsEqual);
