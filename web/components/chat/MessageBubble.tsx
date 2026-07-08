"use client";

import { MessageBubbleActions } from "@/components/chat/MessageBubbleActions";
import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { MessageMarkdown } from "@/components/chat/MessageMarkdown";
import { useStreamingReveal } from "@/hooks/useStreamingReveal";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { formatMessageTime } from "@/lib/chat/groupMessagesByDate";
import { splitAssistantResponseDisplay } from "@/lib/chat/deriveResponseDisplay";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";
import { memo, useMemo, useState } from "react";

export interface MessageBubbleProps {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
  pending?: boolean;
  showSending?: boolean;
  streaming?: boolean;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
}

function bubblePropsEqual(
  prev: MessageBubbleProps,
  next: MessageBubbleProps
): boolean {
  return (
    prev.id === next.id &&
    prev.role === next.role &&
    prev.content === next.content &&
    prev.createdAt === next.createdAt &&
    prev.pending === next.pending &&
    prev.showSending === next.showSending &&
    prev.streaming === next.streaming &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onEdit === next.onEdit
  );
}

export const MessageBubble = memo(function MessageBubble({
  id,
  role,
  content,
  createdAt,
  pending,
  showSending,
  streaming,
  onRegenerate,
  onEdit,
}: MessageBubbleProps) {
  useRenderDiagnostic("MessageBubble");

  const isUser = role === "user";
  const parsed = useMemo(() => parseMessageMedia(content), [content]);
  const safeContent =
    parsed.text.length > 0
      ? parsed.text
      : parsed.images.length === 0 && parsed.videos.length === 0
        ? "(Empty message)"
        : "";

  const revealed = useStreamingReveal(
    safeContent,
    Boolean(!isUser && streaming && safeContent.length > 0)
  );

  const displayContent = !isUser && streaming ? revealed : safeContent;
  const assistantDisplay = useMemo(() => {
    if (isUser || streaming) return null;
    return splitAssistantResponseDisplay(displayContent);
  }, [isUser, displayContent, streaming]);
  const timeLabel = formatMessageTime(createdAt);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(safeContent);

  const body = (
    <>
      {editing && isUser ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/30"
            rows={4}
            aria-label="Edit message"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-accent/10"
              onClick={() => {
                setEditing(false);
                setDraft(safeContent);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"
              onClick={() => {
                if (id && onEdit && draft.trim()) {
                  onEdit(id, draft.trim());
                  setEditing(false);
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {displayContent &&
            (isUser ? (
              <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed sm:text-base">
                {displayContent}
              </p>
            ) : (
              <>
                {assistantDisplay?.title ? (
                  <h2 className="chat-response-title">{assistantDisplay.title}</h2>
                ) : null}
                <MessageMarkdown content={assistantDisplay?.content ?? displayContent} />
              </>
            ))}
          {parsed.images.map((url) => (
            <MessageMediaBlock key={url} url={url} kind="image" />
          ))}
          {parsed.videos.map((url) => (
            <MessageMediaBlock key={url} url={url} kind="video" />
          ))}
        </>
      )}
      {showSending && (
        <p className="mt-2 text-sm text-accent/70" aria-live="polite">
          Sending…
        </p>
      )}
    </>
  );

  const bubbleActions = !editing ? (
    <MessageBubbleActions
      messageId={id}
      role={role}
      content={content}
      disabled={pending || (!isUser && streaming)}
      onEdit={isUser && id && onEdit ? () => setEditing(true) : undefined}
      onRegenerate={
        !isUser && id && onRegenerate ? () => onRegenerate(id) : undefined
      }
    />
  ) : null;

  if (isUser) {
    return (
      <article
        className="group chat-message-turn chat-message-turn-user"
        title={timeLabel || undefined}
      >
        <div className="chat-message-bubble chat-message-bubble-user">
          <div
            className={cn(
              "chat-message-bubble-inner rounded-3xl bg-zinc-200/90 px-4 py-2.5 text-zinc-900 dark:bg-zinc-700/90 dark:text-zinc-50",
              pending && "opacity-80"
            )}
          >
            {body}
          </div>
          {bubbleActions}
        </div>
      </article>
    );
  }

  return (
    <article
      className="group chat-message-turn chat-message-turn-assistant"
      title={timeLabel || undefined}
    >
      <div className="chat-message-bubble flex w-full min-w-0 max-w-full gap-0 sm:gap-3">
        <div
          className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 sm:flex"
          aria-hidden
        >
          <Bot className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 w-full max-w-full flex-1">
          <div className="chat-assistant-body chat-message-bubble-inner px-0 py-0.5 text-foreground sm:py-1">
            {body}
          </div>
          {bubbleActions}
        </div>
      </div>
    </article>
  );
}, bubblePropsEqual);
