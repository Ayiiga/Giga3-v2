"use client";

import { ChatImageDialog, type ChatImageSend } from "@/components/chat/ChatImageDialog";
import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import { MediaVideoPlayer } from "@/components/media/MediaVideoPlayer";
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
  Expand,
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
  onImageSend?: ChatImageSend;
  imageEditDisabled?: boolean;
  poster?: boolean;
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
  onImageSend,
  imageEditDisabled,
  poster,
}: MessageMediaBlockProps) {
  const { feedback, runAction, busy } = useShareAction();
  const { saveData, isSlowNetwork } = useConnectionQuality();
  const [imageDialog, setImageDialog] = useState<"view" | "edit" | null>(null);
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
      <div className={cn("premium-card relative w-full max-w-full overflow-hidden bg-card", kind === "video" ? "aspect-video min-h-[12rem]" : !loaded && "min-h-[12rem]")}>
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
            <button
              type="button"
              aria-label="View image full screen"
              disabled={!loaded}
              onClick={() => setImageDialog("view")}
              className="relative flex w-full items-center justify-center bg-muted/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={poster ? "Missing-person poster" : "Generated or shared image"}
                className={cn("h-auto max-h-[min(70vh,24rem)] w-full object-contain", !loaded && "opacity-0")}
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
              {loaded && (
                <span className="absolute bottom-2 right-2 rounded-full bg-zinc-900/80 p-2 text-white">
                  <Expand size={16} aria-hidden />
                </span>
              )}
            </button>
          </>
        ) : (
          <MediaVideoPlayer url={url} className="absolute inset-0" />
        )}
      </div>
      {imageDialog && (
        <ChatImageDialog
          url={url}
          label={imageDialog === "view" ? "Image preview" : poster ? "Edit poster in chat" : "Edit image in chat"}
          onClose={() => setImageDialog(null)}
          onEdit={imageDialog === "edit"}
          onSend={onImageSend}
          editDisabled={imageEditDisabled}
          poster={poster}
        />
      )}
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
            {onImageSend ? (
              <MediaActionButton label={poster ? "Edit poster in chat" : "Edit image in chat"} disabled={imageEditDisabled} onClick={() => setImageDialog("edit")}>
                <Pencil className="h-4 w-4" aria-hidden />
              </MediaActionButton>
            ) : !poster && (
              <Link
                href={buildImageStudioActionUrl("edit", url)}
                className="touch-target inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm text-foreground"
                aria-label="Edit image in studio"
                title="Edit in Image Studio"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Link>
            )}
            {!poster && (
              <Link
                href={buildImageStudioActionUrl("enhance", url)}
                className="touch-target inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm text-foreground"
                aria-label="Enhance image in studio"
                title="Enhance in Image Studio"
              >
                <Wand2 className="h-4 w-4" aria-hidden />
              </Link>
            )}
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
