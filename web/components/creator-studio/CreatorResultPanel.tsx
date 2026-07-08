"use client";

import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import { Button } from "@/components/ui/Button";
import { COPY_SUCCESS } from "@/lib/chat/chatContentFormat";
import { shareText, copyMarkdownToClipboard, type ShareResult } from "@/lib/share/clientShare";
import { useShareAction } from "@/hooks/useShareAction";
import { cn } from "@/lib/utils";
import { Check, Copy, RefreshCw, Share2, Star } from "lucide-react";
import { memo, useCallback, useState } from "react";

interface CreatorResultPanelProps {
  content: string | null;
  loading?: boolean;
  error?: string | null;
  onRegenerate?: () => void;
  onFavorite?: () => void;
  favorited?: boolean;
  className?: string;
}

export const CreatorResultPanel = memo(function CreatorResultPanel({
  content,
  loading,
  error,
  onRegenerate,
  onFavorite,
  favorited,
  className,
}: CreatorResultPanelProps) {
  const { feedback, runAction, busy } = useShareAction();
  const [copied, setCopied] = useState(false);

  const runCopy = useCallback(async (): Promise<ShareResult> => {
    if (!content?.trim()) return { ok: false, reason: "Nothing to copy" };
    const result = await copyMarkdownToClipboard(content);
    if (result.ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
    return result;
  }, [content]);

  const runShare = useCallback(async (): Promise<ShareResult> => {
    if (!content?.trim()) return { ok: false, reason: "Nothing to share" };
    return shareText({ title: "Giga3 AI Creator", text: content.slice(0, 8000) });
  }, [content]);

  if (loading) {
    return (
      <div
        className={cn(
          "saas-card flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-2xl border border-border p-6 text-center",
          className
        )}
      >
        <div className="h-10 w-10 animate-pulse rounded-full bg-accent/15" aria-hidden />
        <p className="text-sm font-medium text-foreground">Generating with Giga3 AI…</p>
        <p className="text-xs text-muted">This usually takes a few seconds.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800",
          className
        )}
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!content) {
    return (
      <div
        className={cn(
          "saas-card flex min-h-[10rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center",
          className
        )}
      >
        <p className="text-sm text-muted">
          Your generated content will appear here. Choose a tool, enter a prompt, and tap Generate.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("saas-card rounded-2xl border border-border", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-foreground">Generated result</p>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void runAction(runCopy, COPY_SUCCESS)}
            className="min-h-9"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? COPY_SUCCESS : "Copy"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void runAction(runShare, "Shared")}
            className="min-h-9"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Share
          </Button>
          {onFavorite && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onFavorite}
              className="min-h-9"
            >
              <Star
                className={cn("h-4 w-4", favorited && "fill-amber-400 text-amber-500")}
                aria-hidden
              />
              Save
            </Button>
          )}
          {onRegenerate && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={onRegenerate}
              className="min-h-9"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Regenerate
            </Button>
          )}
        </div>
      </div>
      <div className="max-h-[28rem] overflow-y-auto px-4 py-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
          {content}
        </pre>
      </div>
      <ShareActionFeedback feedback={feedback} />
    </div>
  );
});
