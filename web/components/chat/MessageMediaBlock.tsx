"use client";

import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { COPY_SUCCESS, SHARE_SUCCESS } from "@/lib/chat/chatContentFormat";
import {
  copyUrlToClipboard,
  saveRemoteMediaToDevice,
  shareRemoteMedia,
  type ShareResult,
} from "@/lib/share/clientShare";
import { useShareAction } from "@/hooks/useShareAction";
import { cn } from "@/lib/utils";
import { memo, useCallback, useState, type ReactNode } from "react";
import { buildImageStudioActionUrl } from "@/lib/chat/imageStudioLinks";
import {
  Copy,
  Download,
  ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
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
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium text-foreground hover:bg-zinc-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
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
  const { saveData, isSlowNetwork } = useConnectionQuality();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [userRequestedLoad, setUserRequestedLoad] = useState(false);
  const deferLoad = (saveData || isSlowNetwork) && kind === "image" && !userRequestedLoad;

  const run = useCallback(
    async (
      action: () => Promise<ShareResult>,
      successMessage: string
    ) => {
      await runAction(action, successMessage);
    },
    [runAction]
  );

  const handleMediaError = useCallback(() => {
    setLoadError(true);
    setLoaded(false);
  }, []);

  const retryLoad = useCallback(() => {
    setLoadError(false);
    setLoaded(false);
    setUserRequestedLoad(true);
  }, []);

  return (
    <div className={cn("relative mt-3 min-w-0 max-w-full space-y-2", className)}>
      <ShareActionFeedback feedback={feedback} />
      <div className="premium-card relative aspect-video min-h-[12rem] w-full max-w-full overflow-hidden bg-card">
        {deferLoad ? (
          <button
            type="button"
            onClick={() => setUserRequestedLoad(true)}
            className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-2 bg-muted/30 px-4 text-center text-sm text-muted"
          >
            <ImageIcon className="h-8 w-8 opacity-60" aria-hidden />
            <span>Tap to load image (saves data)</span>
          </button>
        ) : loadError ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted">
            <p>Could not load media on this connection.</p>
            <button
              type="button"
              onClick={retryLoad}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Retry
            </button>
          </div>
        ) : kind === "image" ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                <Loader2 className="h-6 w-6 animate-spin text-muted" aria-hidden />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Generated or shared image"
              className={cn(
                "h-auto max-h-[min(70vh,24rem)] w-full max-w-full object-contain transition-opacity",
                loaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              decoding="async"
              width={640}
              height={360}
              onLoad={() => {
                setLoaded(true);
                setLoadError(false);
              }}
              onError={handleMediaError}
            />
          </>
        ) : (
          <video
            src={url}
            controls
            playsInline
            preload="none"
            poster={undefined}
            className="h-auto max-h-[min(70vh,24rem)] w-full max-w-full bg-black object-contain"
            width={640}
            height={360}
            onError={handleMediaError}
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
