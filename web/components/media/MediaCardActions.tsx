"use client";

import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import { useShareAction } from "@/hooks/useShareAction";
import { COPY_SUCCESS, SHARE_SUCCESS } from "@/lib/chat/chatContentFormat";
import { buildImageStudioActionUrl } from "@/lib/chat/imageStudioLinks";
import {
  copyUrlToClipboard,
  saveRemoteMediaToDevice,
  shareRemoteMedia,
  type ShareResult,
} from "@/lib/share/clientShare";
import { cn } from "@/lib/utils";
import { Copy, Download, Loader2, Pencil, Share2, Wand2 } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import type { ReactNode } from "react";

interface MediaCardActionsProps {
  url: string;
  kind: "image" | "video";
  className?: string;
}

function ActionButton({
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
      className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2.5 text-foreground shadow-sm hover:bg-muted/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {children}
    </button>
  );
}

export function MediaCardActions({ url, kind, className }: MediaCardActionsProps) {
  const { feedback, runAction, busy } = useShareAction();

  const run = useCallback(
    async (action: () => Promise<ShareResult>, successMessage: string) => {
      await runAction(action, successMessage);
    },
    [runAction]
  );

  return (
    <div className={cn("relative border-t border-border bg-muted/20 px-3 py-2.5", className)}>
      <ShareActionFeedback feedback={feedback} />
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton
          label={kind === "image" ? "Save image" : "Save video"}
          disabled={busy}
          onClick={() =>
            void run(() => saveRemoteMediaToDevice(url, kind), "Saved Successfully")
          }
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
        </ActionButton>
        <ActionButton
          label={kind === "image" ? "Share image" : "Share video"}
          disabled={busy}
          onClick={() => void run(() => shareRemoteMedia(url, kind), SHARE_SUCCESS)}
        >
          <Share2 className="h-4 w-4" aria-hidden />
        </ActionButton>
        <ActionButton
          label="Copy media link"
          disabled={busy}
          onClick={() => void run(() => copyUrlToClipboard(url), COPY_SUCCESS)}
        >
          <Copy className="h-4 w-4" aria-hidden />
        </ActionButton>
        {kind === "image" && (
          <>
            <Link
              href={buildImageStudioActionUrl("edit", url)}
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2.5 text-foreground shadow-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Edit image in studio"
              title="Edit in Image Studio"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={buildImageStudioActionUrl("enhance", url)}
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2.5 text-foreground shadow-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Enhance image"
              title="Enhance"
            >
              <Wand2 className="h-4 w-4" aria-hidden />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
