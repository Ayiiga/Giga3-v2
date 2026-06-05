"use client";

import { MessageMediaBlock } from "@/components/chat/MessageMediaBlock";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { parseMessageMedia } from "@/lib/chat/parseMessageMedia";
import { cn } from "@/lib/utils";
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
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "chat-message-bubble max-w-[92%] rounded-2xl border px-5 py-4 text-base font-medium leading-relaxed shadow-md sm:max-w-[80%] sm:text-lg",
          isUser
            ? "rounded-br-md border-violet-300/80 bg-white text-black shadow-violet-500/15"
            : "rounded-bl-md border-zinc-200 bg-zinc-50 text-black shadow-black/10",
          pending && "ring-2 ring-violet-400/50"
        )}
      >
        {safeContent && (
          <p className="whitespace-pre-wrap break-words text-black">{safeContent}</p>
        )}
        {parsed.images.map((url) => (
          <MessageMediaBlock key={url} url={url} kind="image" />
        ))}
        {parsed.videos.map((url) => (
          <MessageMediaBlock key={url} url={url} kind="video" />
        ))}
        {pending && (
          <p className="mt-2 text-sm font-normal text-zinc-600" aria-live="polite">
            Sending…
          </p>
        )}
      </div>
    </div>
  );
}, bubblePropsEqual);
