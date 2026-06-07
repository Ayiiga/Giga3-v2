"use client";

import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { MessageMarkdown } from "@/components/chat/MessageMarkdown";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { parseMessageMedia } from "@/lib/chat/parseMessageMedia";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { memo, useMemo } from "react";

export interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  /** Optimistic / in-flight user message */
  pending?: boolean;
}

function bubblePropsEqual(
  prev: MessageBubbleProps,
  next: MessageBubbleProps
): boolean {
  return (
    prev.role === next.role &&
    prev.content === next.content &&
    prev.pending === next.pending
  );
}

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  pending,
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
        "flex w-full gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-accent-subtle text-accent"
            : "bg-zinc-100 text-zinc-600"
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
          "chat-message-bubble min-w-0 max-w-[min(100%,36rem)] rounded-2xl px-4 py-3 text-base leading-[1.7] sm:px-5 sm:py-4",
          isUser
            ? "rounded-tr-md bg-accent-subtle text-foreground"
            : "rounded-tl-md bg-white text-foreground",
          pending && "ring-2 ring-accent/30"
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
          <p className="mt-2 text-sm text-accent/80" aria-live="polite">
            Sending…
          </p>
        )}
      </div>
    </div>
  );
}, bubblePropsEqual);
