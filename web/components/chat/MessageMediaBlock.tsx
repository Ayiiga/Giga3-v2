"use client";

import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import { COPY_SUCCESS, SHARE_SUCCESS } from "@/lib/chat/chatContentFormat";
import {
  copyUrlToClipboard,
  saveRemoteMediaToDevice,
  shareRemoteMedia,
  type ShareResult,
} from "@/lib/share/clientShare";
import { useShareAction } from "@/hooks/useShareAction";
import { cn } from "@/lib/utils";
import { memo, useCallback, type ReactNode } from "react";
import { buildImageStudioActionUrl } from "@/lib/chat/imageStudioLinks";
import {
  Copy,
  Download,
  ImageIcon,
  Loader2,
  Pencil,
  Share2,
  Video,
  Wand2,
} from "lucide-react";
import Link from "next/link";

interface MessageMediaBlockProps {
  url: string;
  kind: "image" | "video";
  className?: string;
}

function MediaActionButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="touch-target inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-white px-2 text-sm font-medium text-foreground shadow-sm hover:bg-zinc-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {children}
    </button>
  );
}

export const MessageMediaBlock = memo(function MessageMediaBlock({
  url,
  kind,
  className,
}: MessageMediaBlockProps) {
  const { feedback, runAction, busy } = useShareAction();

  const run = useCallback(
    async (
      action: () => Promise<ShareResult>,
      successMessage: string
    ) => {
      await runAction(action, successMessage);
    },
    [runAction]
  );

  return (
    <div className={cn("relative mt-3 min-w-0 max-w-full space-y-2", className)}>
      <ShareActionFeedback feedback={feedback} />
      <div className="premium-card aspect-video min-h-[12rem] w-full max-w-full overflow-hidden bg-card">
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Generated or shared image"
            className="h-auto max-h-[min(70vh,24rem)] w-full max-w-full object-contain"
            loading="lazy"
            decoding="async"
            width={640}
            height={360}
          />
        ) : (
          <video
            src={url}
            controls
            playsInline
            preload="none"
            className="h-auto max-h-[min(70vh,24rem)] w-full max-w-full bg-black object-contain"
            width={640}
            height={360}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <MediaActionButton
          label={kind === "image" ? "Save image" : "Save video"}
          disabled={busy}
          onClick={() =>
            void run(
              () => saveRemoteMediaToDevice(url, kind),
              "Saved Successfully"
            )
          }
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
        </MediaActionButton>
        <MediaActionButton
          label={kind === "image" ? "Share image" : "Share video"}
          disabled={busy}
          onClick={() =>
            void run(() => shareRemoteMedia(url, kind), SHARE_SUCCESS)
          }
        >
          <Share2 className="h-4 w-4" aria-hidden />
        </MediaActionButton>
        <MediaActionButton
          label="Copy media link"
          disabled={busy}
          onClick={() => void run(() => copyUrlToClipboard(url), COPY_SUCCESS)}
        >
          <Copy className="h-4 w-4" aria-hidden />
        </MediaActionButton>
        {kind === "image" && (
          <>
            <Link
              href={buildImageStudioActionUrl("edit", url)}
              className="touch-target inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Edit image in studio"
              title="Edit in Image Studio"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={buildImageStudioActionUrl("enhance", url)}
              className="touch-target inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Enhance image"
              title="Enhance"
            >
              <Wand2 className="h-4 w-4" aria-hidden />
            </Link>
          </>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          {kind === "image" ? (
            <ImageIcon className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Video className="h-3.5 w-3.5" aria-hidden />
          )}
          {kind === "image" ? "Image" : "Video"}
        </span>
      </div>
    </div>
  );
});
