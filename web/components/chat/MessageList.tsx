"use client";

import { MessageBubble } from "@/components/chat/MessageBubble";
import type { DocumentTemplateId } from "@/lib/chat/documentTemplates";
import { watchLocalDay } from "@/lib/chat/dailyChat";
import { HOME_QUICK_ACTIONS, type HomeQuickActionId } from "@/lib/chat/homeQuickActions";
import {
  HOME_DESTINATIONS,
  buildHomeGreeting,
  listSyncHomeResumeItems,
  listUserSavedPrompts,
  type HomeResumeItem,
} from "@/lib/chat/homeContinuity";
import { getDailySuggestedPrompts, getSuggestedPrompts } from "@/lib/chat/suggestedPrompts";
import type { AiModeId } from "@/lib/aiRouter";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { useScrollToLatestMessage } from "@/hooks/useScrollToLatestMessage";
import { ScrollToLatestButton } from "@/components/chat/ScrollToLatestButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { messageListScrollKey } from "@/lib/chat/stableMessages";
import { groupMessagesByDate } from "@/lib/chat/groupMessagesByDate";
import type { OutboxEntry } from "@/lib/chat/offlineOutbox";
import { resolvePendingDeliveryState } from "@/lib/chat/outboxUi";
import { listGigaEditProjects } from "@/lib/gigaedit/projects";
import Link from "next/link";
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
  /** Home quick actions (Learn / Research / Create / Code) — mode switch only. */
  onQuickAction?: (action: HomeQuickActionId) => void;
  /** Compact "Continue" history — only the user's own authorized conversations. */
  recentConversations?: RecentConversationItem[];
  onSelectConversation?: (id: string) => void;
  /** Signed-in email for greeting (local-part only; never shown raw). */
  userEmail?: string | null;
  outboxEntries?: OutboxEntry[];
  flushingOutboxId?: string | null;
}

export interface RecentConversationItem {
  id: string;
  title: string;
  mode: string;
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
  onQuickAction,
  recentConversations,
  onSelectConversation,
  userEmail = null,
  outboxEntries = [],
  flushingOutboxId = null,
}: MessageListProps) {
  useRenderDiagnostic("MessageList");

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollKey = useMemo(() => messageListScrollKey(messages), [messages]);
  const pendingContent = useMemo(
    () => messages.find((m) => m.id === "pending-user")?.content,
    [messages]
  );
  const pendingDelivery = useMemo(
    () => resolvePendingDeliveryState(pendingContent, outboxEntries, flushingOutboxId),
    [pendingContent, outboxEntries, flushingOutboxId]
  );
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

  const [dayKey, setDayKey] = useState<string | null>(null);
  useEffect(() => watchLocalDay(setDayKey), []);
  const suggestedPrompts = useMemo(
    () =>
      dayKey
        ? getDailySuggestedPrompts(mode, 3, dayKey)
        : getSuggestedPrompts(mode, 3),
    [mode, dayKey]
  );

  const greeting = useMemo(
    () => buildHomeGreeting({ email: userEmail }),
    [userEmail]
  );

  const [resumeItems, setResumeItems] = useState<HomeResumeItem[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<
    ReturnType<typeof listUserSavedPrompts>
  >([]);

  useEffect(() => {
    if (messages.length > 0) return;
    setResumeItems(listSyncHomeResumeItems(4));
    setSavedPrompts(listUserSavedPrompts(3));
    let cancelled = false;
    void listGigaEditProjects()
      .then((projects) => {
        if (cancelled) return;
        const draft = projects
          .filter((p) => p.status === "draft")
          .sort((a, b) => b.updatedAt - a.updatedAt)[0];
        if (!draft) return;
        setResumeItems((prev) => {
          if (prev.some((i) => i.id === `edit-${draft.id}`)) return prev;
          return [
            {
              id: `edit-${draft.id}`,
              label: draft.title?.trim() || "Untitled edit",
              detail: "GigaEdit draft on this device",
              href: `/gigaedit/?project=${encodeURIComponent(draft.id)}`,
              kind: "create" as const,
            },
            ...prev,
          ].slice(0, 4);
        });
      })
      .catch(() => {
        /* IndexedDB unavailable — skip */
      });
    return () => {
      cancelled = true;
    };
  }, [messages.length]);

  return (
    <div className="chat-message-list relative min-h-0 min-w-0 max-w-full overflow-x-clip overflow-y-hidden bg-background">
      <div
        ref={scrollRef}
        className="message-list-scroll chat-message-scroll-region overscroll-y-contain py-2 sm:py-6"
      >
        {isLoading && messages.length === 0 && (
          <LoadingState label="Loading messages…" className="h-full min-h-[12rem]" />
        )}

        {messages.length === 0 && !isLoading && (
          <div className="chat-rail flex w-full flex-col items-center px-4 pt-5 text-center sm:pt-8">
            <h2 className="chat-welcome-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {greeting.title}
            </h2>
            <p className="mt-1.5 text-sm text-muted sm:text-base">{greeting.subtitle}</p>

            <div
              className="mt-4 grid w-full max-w-md grid-cols-2 gap-2"
              role="group"
              aria-label="Quick actions"
            >
              {HOME_QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onQuickAction?.(action.id)}
                  title={action.description}
                  aria-label={`${action.label}: ${action.description}`}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:border-accent/30 hover:bg-accent/5"
                >
                  <span aria-hidden>{action.emoji}</span>
                  {action.label}
                </button>
              ))}
            </div>

            {onSelectConversation && recentConversations && recentConversations.length > 0 && (
              <section
                className="mt-5 w-full max-w-md text-left"
                aria-label="Continue recent chats"
              >
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Recent chats
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {recentConversations.slice(0, 3).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onSelectConversation(c.id)}
                        className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-left text-sm text-foreground shadow-sm hover:border-accent/30"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {c.title || "Untitled chat"}
                        </span>
                        <span className="shrink-0 text-xs font-medium text-accent">
                          Continue
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {resumeItems.length > 0 && (
              <section
                className="mt-4 w-full max-w-md text-left"
                aria-label="Resume unfinished work"
              >
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Pick up unfinished work
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {resumeItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-left text-sm text-foreground shadow-sm hover:border-accent/30"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.label}</span>
                          <span className="block truncate text-xs text-muted">
                            {item.detail}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-medium text-accent">Open</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {onInsertTemplate && savedPrompts.length > 0 && (
              <section
                className="mt-4 w-full max-w-md text-left"
                aria-label="Saved prompts"
              >
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Saved prompts
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {savedPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={() => onInsertTemplate(prompt.body)}
                      className="min-h-10 rounded-full border border-border bg-white px-3 py-1.5 text-sm text-foreground shadow-sm hover:border-accent/30 hover:bg-accent/5"
                    >
                      {prompt.title}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <nav
              className="mt-5 w-full max-w-md"
              aria-label="Giga3 destinations"
            >
              <h3 className="px-1 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Destinations
              </h3>
              <ul className="mt-2 grid grid-cols-5 gap-1.5">
                {HOME_DESTINATIONS.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={d.href}
                      title={d.description}
                      className="flex min-h-11 flex-col items-center justify-center rounded-xl border border-border bg-white px-1 py-1.5 text-center text-[11px] font-medium text-foreground shadow-sm hover:border-accent/30 hover:bg-accent/5 sm:text-xs"
                    >
                      {d.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {onInsertTemplate && (
              <>
                <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">
                  Try an example
                </p>
                <div className="mt-2 flex w-full max-w-md flex-wrap justify-center gap-2">
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
              </>
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
                    showSending={m.id === "pending-user" && pendingDelivery === "sending"}
                    deliveryQueued={m.id === "pending-user" && pendingDelivery === "queued"}
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
    prev.onQuickAction === next.onQuickAction &&
    prev.recentConversations === next.recentConversations &&
    prev.onSelectConversation === next.onSelectConversation &&
    prev.userEmail === next.userEmail &&
    prev.messages === next.messages &&
    prev.outboxEntries === next.outboxEntries &&
    prev.flushingOutboxId === next.flushingOutboxId
  );
}

export const MessageList = memo(MessageListInner, propsEqual);
