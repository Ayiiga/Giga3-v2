"use client";

import { messagePlainText } from "@/lib/chat/messagePlainText";
import { copyTextToClipboard, shareText } from "@/lib/share/clientShare";
import { cn } from "@/lib/utils";
import { Check, Copy, Share2 } from "lucide-react";
import { memo, useCallback, useState, type ReactNode } from "react";

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
  const [copied, setCopied] = useState(false);

  const plain = messagePlainText(role, content);

  const flashCopied = useCallback(() => {
    setCopied(true);
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, []);

  const runCopy = useCallback(async () => {
    if (!plain.trim()) return;
    const result = await copyTextToClipboard(plain);
    if (result.ok) flashCopied();
  }, [plain, flashCopied]);

  const runShare = useCallback(async () => {
    if (!plain.trim()) return;
    await shareText({
      title: role === "user" ? "My message" : "Giga3 AI reply",
      text: plain.slice(0, 12_000),
    });
  }, [plain, role]);

  if (!plain.trim() || disabled) return null;

  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity",
        "sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
        isUserAlign(role) ? "justify-end" : "justify-start",
        className
      )}
    >
      <ActionButton
        label={copied ? "Copied" : "Copy message"}
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
  );
});

function isUserAlign(role: "user" | "assistant"): boolean {
  return role === "user";
}

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
      className="touch-target inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted hover:bg-zinc-100 hover:text-foreground"
    >
      {children}
    </button>
  );
}
