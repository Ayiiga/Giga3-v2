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
    <div
      className={cn(
        "group flex w-full gap-3 py-1",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border shadow-sm",
          isUser
            ? "bg-accent/10 text-accent"
            : "bg-card text-muted"
        )}
        aria-hidden
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      <div
        className={cn(
          "chat-message-bubble min-w-0 flex-1 text-base leading-[1.7]",
          isUser ? "max-w-[85%]" : "max-w-full"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "border border-accent/15 bg-[var(--bubble-user)] text-foreground shadow-sm"
              : "bg-[var(--bubble-assistant)] px-0 py-1 text-foreground",
            pending && isUser && "ring-1 ring-accent/30"
          )}
        >
          {safeContent && (
            isUser ? (
              <p className="whitespace-pre-wrap break-words">{safeContent}</p>
            ) : (
              <MessageMarkdown content={safeContent} />
            )
          )}
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
    </div>
  );
}, bubblePropsEqual);
