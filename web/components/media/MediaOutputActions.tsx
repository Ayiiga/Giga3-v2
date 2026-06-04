"use client";

import {
  copyTextToClipboard,
  downloadRemoteFile,
  shareRemoteMedia,
} from "@/lib/download";
import { cn } from "@/lib/utils";
import { Download, Share2 } from "lucide-react";
import { useState } from "react";

interface MediaOutputActionsProps {
  url: string;
  mediaType: "image" | "video";
  className?: string;
  compact?: boolean;
}

export function MediaOutputActions({
  url,
  mediaType,
  className,
  compact = false,
}: MediaOutputActionsProps) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ext = mediaType === "video" ? "mp4" : "png";
  const filename = `giga3-${mediaType}-${Date.now()}.${ext}`;
  const mimeType = mediaType === "video" ? "video/mp4" : "image/png";

  async function handleDownload() {
    setBusy("download");
    setNotice(null);
    try {
      await downloadRemoteFile(url, filename);
      setNotice("Download started");
    } catch {
      try {
        window.open(url, "_blank", "noopener,noreferrer");
        setNotice("Opened in new tab — save from there");
      } catch {
        setNotice("Download failed");
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    setNotice(null);
    try {
      const shared = await shareRemoteMedia({
        title: `Giga3 ${mediaType}`,
        url,
        filename,
        mimeType,
      });
      setNotice(shared ? "Shared" : "Share cancelled");
    } catch {
      try {
        await copyTextToClipboard(url);
        setNotice("Link copied");
      } catch {
        setNotice("Share unavailable");
      }
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-zinc-50 disabled:opacity-50";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        className={btn}
        disabled={Boolean(busy)}
        onClick={() => void handleDownload()}
        aria-label={`Download ${mediaType}`}
      >
        <Download className="h-4 w-4" aria-hidden />
        {!compact && "Download"}
      </button>
      <button
        type="button"
        className={btn}
        disabled={Boolean(busy)}
        onClick={() => void handleShare()}
        aria-label={`Share ${mediaType}`}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        {!compact && "Share"}
      </button>
      {notice && (
        <span className="text-xs font-medium text-muted" role="status">
          {notice}
        </span>
      )}
    </div>
  );
}
