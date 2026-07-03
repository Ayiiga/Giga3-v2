"use client";

import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import {
  COPY_SUCCESS,
  SHARE_SUCCESS,
  formatMessageForCopy,
  formatMessageForShare,
  messageHasCopyableContent,
} from "@/lib/chat/chatContentFormat";
import { isMessageFavorite, toggleMessageFavorite } from "@/lib/chat/messageFavorites";
import { openMessagePrintView } from "@/lib/chat/exportChat";
import { parseMessageMedia } from "@/lib/chat/parseMessageMedia";
import { copyMarkdownToClipboard, shareText } from "@/lib/share/clientShare";
import { useShareAction } from "@/hooks/useShareAction";
import { cn } from "@/lib/utils";
import { Check, Copy, FileDown, Pencil, RefreshCw, Share2, Star } from "lucide-react";
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";

/** Assistant replies with enough prose are treated as downloadable documents. */
const DOCUMENT_MIN_CHARS = 200;

interface MessageBubbleActionsProps {
  messageId?: string;
  role: "user" | "assistant";
  content: string;
  disabled?: boolean;
  className?: string;
  onRegenerate?: () => void;
  onEdit?: () => void;
}

export const MessageBubbleActions = memo(function MessageBubbleActions({
  messageId,
  role,
  content,
  disabled,
  className,
  onRegenerate,
  onEdit,
}: MessageBubbleActionsProps) {
  const { feedback, runAction, busy } = useShareAction();
  const [copied, setCopied] = useState(false);
  const [favorited, setFavorited] = useState(
    messageId ? isMessageFavorite(messageId) : false
  );

  const copyText = useMemo(
    () => formatMessageForCopy(role, content),
    [role, content]
  );

  const flashCopiedIcon = useCallback(() => {
    setCopied(true);
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, []);

  const runCopy = useCallback(async () => {
    if (!copyText.trim()) return;
    const result = await runAction(
      () => copyMarkdownToClipboard(copyText),
      COPY_SUCCESS
    );
    if (result?.ok) flashCopiedIcon();
  }, [copyText, runAction, flashCopiedIcon]);

  const runShare = useCallback(async () => {
    if (!copyText.trim()) return;
    const payload = formatMessageForShare(role, content);
    await runAction(
      () => shareText({ title: payload.title, text: payload.text }),
      SHARE_SUCCESS
    );
  }, [copyText, content, role, runAction]);

  const runFavorite = useCallback(() => {
    if (!messageId) return;
    setFavorited(toggleMessageFavorite(messageId));
  }, [messageId]);

  const canDownloadPdf = useMemo(() => {
    if (role !== "assistant") return false;
    const { text } = parseMessageMedia(content);
    return text.trim().length >= DOCUMENT_MIN_CHARS;
  }, [role, content]);

  const runDownloadPdf = useCallback(() => {
    try {
      const { text } = parseMessageMedia(content);
      openMessagePrintView(text || content);
    } catch {
      /* pop-up blocked — user can copy instead */
    }
  }, [content]);

  if (!messageHasCopyableContent(content) || disabled) return null;

  return (
    <div
      className={cn(
        "chat-message-bubble-actions relative mt-0.5 min-w-0 max-w-full",
        role === "user" ? "flex justify-end" : "flex justify-start",
        className
      )}
    >
      <ShareActionFeedback
        feedback={feedback}
        align={role === "user" ? "end" : "start"}
      />
      <div
        className={cn(
          "flex max-w-full flex-wrap items-center gap-0",
          "opacity-0 transition-opacity duration-150",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          "max-sm:opacity-40 max-sm:group-active:opacity-100"
        )}
      >
        <ActionButton
          label={copied ? COPY_SUCCESS : "Copy message"}
          disabled={busy}
          onClick={() => void runCopy()}
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-600" aria-hidden />
          ) : (
            <Copy className="h-3 w-3" aria-hidden />
          )}
        </ActionButton>
        <ActionButton
          label="Share message"
          disabled={busy}
          onClick={() => void runShare()}
          className="hidden sm:inline-flex"
        >
          <Share2 className="h-3 w-3" aria-hidden />
        </ActionButton>
        {messageId && (
          <ActionButton
            label={favorited ? "Remove favorite" : "Favorite message"}
            disabled={busy}
            onClick={runFavorite}
            className="hidden md:inline-flex"
          >
            <Star
              className={cn("h-3 w-3", favorited && "fill-amber-400 text-amber-500")}
              aria-hidden
            />
          </ActionButton>
        )}
        {role === "user" && onEdit && (
          <ActionButton label="Edit message" disabled={busy} onClick={onEdit}>
            <Pencil className="h-3 w-3" aria-hidden />
          </ActionButton>
        )}
        {canDownloadPdf && (
          <ActionButton
            label="Download as PDF"
            disabled={busy}
            onClick={runDownloadPdf}
            className="hidden sm:inline-flex"
          >
            <FileDown className="h-3 w-3" aria-hidden />
          </ActionButton>
        )}
        {role === "assistant" && onRegenerate && (
          <ActionButton
            label="Regenerate response"
            disabled={busy || disabled}
            onClick={onRegenerate}
          >
            <RefreshCw className="h-3 w-3" aria-hidden />
          </ActionButton>
        )}
      </div>
    </div>
  );
});

function ActionButton({
  label,
  onClick,
  disabled,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted/80 hover:bg-zinc-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 dark:hover:bg-zinc-800",
        className
      )}
    >
      {children}
    </button>
  );
}
