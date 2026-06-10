"use client";

import { MessageBubbleActions } from "@/components/chat/MessageBubbleActions";
import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { MessageMarkdown } from "@/components/chat/MessageMarkdown";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { parseMessageMedia } from "@/lib/chat/parseMessageMedia";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
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

/** ChatGPT-style turns: user bubble right, assistant prose left — no flex-row-reverse (mobile-safe). */
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

  return (
    <article
      className={cn(
        "group chat-message-turn w-full",
        isUser ? "chat-message-turn-user" : "chat-message-turn-assistant"
      )}
    >
      <div
        className={cn(
          "chat-rail flex gap-3",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        {!isUser && (
          <div
            className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted sm:flex"
            aria-hidden
          >
            <Bot className="h-4 w-4" />
          </div>
        )}

        <div
          className={cn(
            "chat-message-bubble min-w-0",
            isUser ? "max-w-[min(85%,20rem)] sm:max-w-[min(85%,28rem)]" : "w-full max-w-full"
          )}
        >
          <div
            className={cn(
              isUser
                ? "rounded-[1.25rem] bg-violet-100 px-4 py-2.5 text-zinc-900 shadow-sm dark:bg-violet-950/70 dark:text-zinc-100"
                : "chat-assistant-body rounded-2xl bg-zinc-100 px-4 py-3 text-zinc-900 dark:bg-zinc-800/90 dark:text-zinc-100 sm:bg-transparent sm:px-0 sm:py-1 sm:text-foreground dark:sm:bg-transparent",
              pending && isUser && "ring-1 ring-violet-400/40"
            )}
          >
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
          </div>
          <MessageBubbleActions
            role={role}
            content={content}
            disabled={pending}
            onRegenerate={
              id && onRegenerate && role === "assistant"
                ? () => onRegenerate(id)
                : undefined
            }
          />
        </div>

        {isUser && (
          <div
            className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/15 bg-accent/10 text-accent sm:flex"
            aria-hidden
          >
            <User className="h-4 w-4" />
          </div>
        )}
      </div>
    </article>
  );
}, bubblePropsEqual);
