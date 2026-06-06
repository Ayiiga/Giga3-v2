"use client";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { DOCUMENT_TEMPLATES } from "@/lib/chat/documentTemplates";
import { formatCurrentDate, resolveTemplatePlaceholders } from "@/lib/datetime";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { useScrollToLatestMessage } from "@/hooks/useScrollToLatestMessage";
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
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50/40">
      <div
        ref={scrollRef}
        className="message-list-scroll flex-1 overflow-y-auto overscroll-y-contain px-3 py-5 sm:px-6 sm:py-6"
      >
        {isLoading && messages.length === 0 && (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 text-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-violet-200" aria-hidden />
            <p className="text-sm font-medium text-zinc-600">Loading messages…</p>
          </div>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="mx-auto flex h-full min-h-[14rem] max-w-lg flex-col items-center justify-center px-2 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <MessageSquarePlus className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
              Start a conversation
            </h2>
            {todayLabel && (
              <p className="mt-1 text-xs text-zinc-500" suppressHydrationWarning>
                {todayLabel}
              </p>
            )}
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-600">
              Ask anything, pick a template from the workspace above, or tap{" "}
              <span className="font-medium text-zinc-800">Attach</span> to add files.
              Chats save automatically.
            </p>

            {onInsertTemplate && (
              <>
                <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => onInsertTemplate(prompt)}
                      className="rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900 sm:text-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <div className="mt-6 w-full">
                  <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
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
                            "flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-left",
                            "text-xs font-medium text-zinc-800 shadow-sm hover:border-violet-200 hover:bg-violet-50/60"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
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

        <div className="mx-auto flex max-w-3xl flex-col gap-5 sm:gap-6">
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
