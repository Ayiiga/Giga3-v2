"use client";

import { MessageBubbleActions } from "@/components/chat/MessageBubbleActions";
import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { MessageMarkdown } from "@/components/chat/MessageMarkdown";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { parseMessageMedia } from "@/lib/chat/parseMessageMedia";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";
import { memo, useMemo } from "react";

export interface MessageBubbleProps {
  id?: string;
  role: "user" | "assistant";
  content: string;
  /** Optimistic / in-flight user message */
  pending?: boolean;
  onRegenerate?: (messageId: string) => void;
}

function bubblePropsEqual(
  prev: MessageBubbleProps,
  next: MessageBubbleProps
): boolean {
  return (
    prev.id === next.id &&
    prev.role === next.role &&
    prev.content === next.content &&
    prev.pending === next.pending &&
    prev.onRegenerate === next.onRegenerate
  );
}

/** ChatGPT-style thread turns — contained width, user right, assistant full column. */
export const MessageBubble = memo(function MessageBubble({
  id,
  role,
  content,
  pending,
  onRegenerate,
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

  const body = (
    <>
      {safeContent &&
        (isUser ? (
          <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed sm:text-base">
            {safeContent}
          </p>
        ) : (
          <MessageMarkdown content={safeContent} />
        ))}
      {parsed.images.map((url) => (
        <MessageMediaBlock key={url} url={url} kind="image" />
      ))}
      {parsed.videos.map((url) => (
        <MessageMediaBlock key={url} url={url} kind="video" />
      ))}
      {pending && (
        <p className="mt-2 text-sm text-accent/70" aria-live="polite">
          Sending…
        </p>
      )}
    </>
  );

  if (isUser) {
    return (
      <article className="group chat-message-turn chat-message-turn-user">
        <div className="chat-message-bubble chat-message-bubble-user">
          <div
            className={cn(
              "chat-message-bubble-inner rounded-[1.25rem] bg-violet-100 px-4 py-2.5 text-zinc-900 shadow-sm dark:bg-violet-950/70 dark:text-zinc-100",
              pending && "ring-1 ring-violet-400/40"
            )}
          >
            {body}
          </div>
          <MessageBubbleActions
            role={role}
            content={content}
            disabled={pending}
          />
        </div>
      </article>
    );
  }

  return (
    <article className="group chat-message-turn chat-message-turn-assistant">
      <div className="chat-message-bubble flex w-full min-w-0 max-w-full gap-0 sm:gap-3">
        <div
          className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted sm:flex"
          aria-hidden
        >
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0 w-full max-w-full flex-1">
          <div className="chat-assistant-body chat-message-bubble-inner rounded-2xl bg-zinc-100 px-4 py-3 text-zinc-900 dark:bg-zinc-800/90 dark:text-zinc-100 sm:bg-transparent sm:px-0 sm:py-1 sm:text-foreground dark:sm:bg-transparent">
            {body}
          </div>
          <MessageBubbleActions
            role={role}
            content={content}
            disabled={pending}
            onRegenerate={
              id && onRegenerate ? () => onRegenerate(id) : undefined
            }
          />
        </div>
      </div>
    </article>
  );
}, bubblePropsEqual);
