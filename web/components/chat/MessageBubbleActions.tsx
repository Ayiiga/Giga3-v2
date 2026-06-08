"use client";

import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import {
  COPY_SUCCESS,
  SHARE_SUCCESS,
  formatMessageForCopy,
  formatMessageForShare,
  messageHasCopyableContent,
} from "@/lib/chat/chatContentFormat";
import { copyMarkdownToClipboard, shareText } from "@/lib/share/clientShare";
import { useShareAction } from "@/hooks/useShareAction";
import { cn } from "@/lib/utils";
import { Check, Copy, Share2 } from "lucide-react";
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";

interface MessageBubbleActionsProps {
  role: "user" | "assistant";
  content: string;
  disabled?: boolean;
  className?: string;
}

export const MessageBubbleActions = memo(function MessageBubbleActions({
  role,
  content,
  disabled,
  className,
}: MessageBubbleActionsProps) {
  const { feedback, runAction } = useShareAction();
  const [copied, setCopied] = useState(false);

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

  if (!messageHasCopyableContent(content) || disabled) return null;

  return (
    <div
      className={cn(
        "relative mt-1 min-h-9",
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
          "flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity",
          "sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        )}
      >
        <ActionButton
          label={copied ? COPY_SUCCESS : "Copy message"}
          onClick={() => void runCopy()}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
        </ActionButton>
        <ActionButton label="Share message" onClick={() => void runShare()}>
          <Share2 className="h-3.5 w-3.5" aria-hidden />
        </ActionButton>
      </div>
    </div>
  );
});

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="touch-target inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted hover:bg-zinc-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {children}
    </button>
  );
}
