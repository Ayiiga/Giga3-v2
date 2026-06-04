"use client";

import {
  copyTextToClipboard,
  downloadRemoteFile,
  saveToGallery,
  shareRemoteMedia,
} from "@/lib/download";
import { cn } from "@/lib/utils";
import { Download, Images, Share2 } from "lucide-react";
import { memo, useState } from "react";

interface MediaOutputActionsProps {
  url: string;
  mediaType: "image" | "video";
  className?: string;
  compact?: boolean;
}

function MediaOutputActionsInner({
  url,
  mediaType,
  className,
  compact = false,
}: MediaOutputActionsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const ext = mediaType === "video" ? "mp4" : "png";
  const filename = `giga3-${mediaType}-${Date.now()}.${ext}`;
  const mimeType = mediaType === "video" ? "video/mp4" : "image/png";

  const btn =
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-zinc-50 disabled:opacity-50";

  async function run(
    key: string,
    fn: () => Promise<void>,
    success: string
  ) {
    setBusy(key);
    setNotice(null);
    setProgress(null);
    try {
      await fn();
      setNotice(success);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        className={btn}
        disabled={Boolean(busy)}
        onClick={() =>
          void run("gallery", async () => {
            const r = await saveToGallery({
              url,
              filename,
              mimeType,
              onProgress: setProgress,
            });
            setNotice(r.message);
          }, "Saved")
        }
        aria-label={`Save ${mediaType} to gallery`}
      >
        <Images className="h-4 w-4" aria-hidden />
        {!compact && "Save to Gallery"}
      </button>
      <button
        type="button"
        className={btn}
        disabled={Boolean(busy)}
        onClick={() =>
          void run("download", async () => {
            await downloadRemoteFile(url, filename, setProgress);
            setNotice("Download started");
          }, "Downloaded")
        }
        aria-label={`Download ${mediaType}`}
      >
        <Download className="h-4 w-4" aria-hidden />
        {!compact && "Download"}
      </button>
      <button
        type="button"
        className={btn}
        disabled={Boolean(busy)}
        onClick={() =>
          void run("share", async () => {
            const ok = await shareRemoteMedia({
              title: `Giga3 ${mediaType}`,
              url,
              filename,
              mimeType,
              onProgress: setProgress,
            });
            setNotice(ok ? "Shared" : "Cancelled");
          }, "Shared")
        }
        aria-label={`Share ${mediaType}`}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        {!compact && "Share"}
      </button>
      <button
        type="button"
        className={btn}
        disabled={Boolean(busy)}
        onClick={() =>
          void run("copy", () => copyTextToClipboard(url), "Link copied")
        }
        aria-label="Copy media link"
      >
        {!compact && "Copy link"}
      </button>
      {(notice || progress !== null) && (
        <span className="w-full text-xs font-medium text-muted" role="status">
          {progress !== null && progress < 100
            ? `Downloading… ${progress}%`
            : notice}
        </span>
      )}
    </div>
  );
}

export const MediaOutputActions = memo(MediaOutputActionsInner);
