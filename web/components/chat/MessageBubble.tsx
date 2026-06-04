"use client";

import { MediaContextMenu } from "@/components/media/MediaContextMenu";
import { MediaOutputActions } from "@/components/media/MediaOutputActions";
import { extractMediaUrls } from "@/lib/chat/mediaUrls";
import { cn } from "@/lib/utils";
import { memo } from "react";

export interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

function MessageBubbleInner({ role, content, pending }: MessageBubbleProps) {
  const isUser = role === "user";
  const safeContent =
    typeof content === "string" && content.length > 0
      ? content
      : "(Empty message)";
  const { images, videos } = extractMediaUrls(safeContent);

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl border px-5 py-4 text-base font-medium leading-relaxed shadow-md sm:max-w-[80%] sm:text-lg",
          isUser
            ? "rounded-br-md border-violet-300/80 bg-white text-black shadow-violet-500/15"
            : "rounded-bl-md border-zinc-200 bg-zinc-50 text-black shadow-black/10",
          pending && "ring-2 ring-violet-400/50"
        )}
      >
        <p className="whitespace-pre-wrap break-words text-black">{safeContent}</p>
        {(images.length > 0 || videos.length > 0) && (
          <div className="mt-3 space-y-3 border-t border-zinc-200/80 pt-3">
            {images.map((url) => (
              <MediaContextMenu key={url} url={url} mediaType="image">
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Generated"
                    width={640}
                    height={360}
                    className="max-h-64 w-full rounded-xl bg-zinc-100 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  <MediaOutputActions url={url} mediaType="image" compact />
                </div>
              </MediaContextMenu>
            ))}
            {videos.map((url) => (
              <MediaContextMenu key={url} url={url} mediaType="video">
                <div className="space-y-2">
                  <video
                    src={url}
                    controls
                    className="max-h-64 w-full rounded-xl bg-black"
                    preload="metadata"
                  />
                  <MediaOutputActions url={url} mediaType="video" compact />
                </div>
              </MediaContextMenu>
            ))}
          </div>
        )}
        {pending && (
          <p className="mt-2 text-sm font-normal text-zinc-600" aria-live="polite">
            Sending…
          </p>
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleInner);
