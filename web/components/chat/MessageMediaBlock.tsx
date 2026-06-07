"use client";

import { memo, useCallback, useState, type ReactNode } from "react";
import {
  Download,
  ImageIcon,
  Loader2,
  Share2,
  Video,
} from "lucide-react";
import {
  saveRemoteMediaToDevice,
  shareRemoteMedia,
  type ShareResult,
} from "@/lib/share/clientShare";
import { cn } from "@/lib/utils";

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
      className="touch-target inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-foreground shadow-subtle hover:bg-zinc-50 disabled:opacity-50"
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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<ShareResult>, failLabel: string) => {
      if (busy) return;
      setBusy(true);
      setNotice(null);
      try {
        const result = await action();
        if (!result.ok && result.reason !== "Share cancelled" && result.reason !== "Save cancelled") {
          setNotice(result.reason || failLabel);
        }
      } catch (e) {
        setNotice(e instanceof Error ? e.message : failLabel);
      } finally {
        setBusy(false);
      }
    },
    [busy]
  );

  return (
    <div className={cn("mt-3 space-y-2", className)}>
      <div className="aspect-video min-h-[12rem] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Generated or shared image"
            className="h-full w-full object-contain"
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
            preload="metadata"
            className="h-full w-full bg-black object-contain"
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <MediaActionButton
          label={kind === "image" ? "Save image to gallery" : "Save video to gallery"}
          disabled={busy}
          onClick={() =>
            void run(() => saveRemoteMediaToDevice(url, kind), "Could not save")
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
            void run(() => shareRemoteMedia(url, kind), "Could not share")
          }
        >
          <Share2 className="h-4 w-4" aria-hidden />
        </MediaActionButton>
        <span className="inline-flex items-center gap-1 text-xs text-zinc-600">
          {kind === "image" ? (
            <ImageIcon className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Video className="h-3.5 w-3.5" aria-hidden />
          )}
          {kind === "image" ? "Image" : "Video"}
        </span>
      </div>
      {notice && (
        <p className="text-xs text-amber-800" role="status">
          {notice}
        </p>
      )}
    </div>
  );
});
