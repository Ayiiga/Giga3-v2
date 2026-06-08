"use client";

import type { UiMessage } from "@/components/chat/MessageList";
import {
  downloadTextFile,
  formatChatAsPlainText,
  openChatPrintView,
} from "@/lib/chat/exportChat";
import { copyTextToClipboard, shareText } from "@/lib/share/clientShare";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Copy,
  FileText,
  Printer,
  Share2,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

interface ChatActionsMenuProps {
  messages: UiMessage[];
  conversationTitle?: string;
  email?: string;
  disabled?: boolean;
  className?: string;
}

export const ChatActionsMenu = memo(function ChatActionsMenu({
  messages,
  conversationTitle,
  email,
  disabled,
  className,
}: ChatActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const plain = formatChatAsPlainText(messages, {
    title: conversationTitle,
    email,
  });

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const flash = useCallback((msg: string) => {
    setStatus(msg);
    const t = window.setTimeout(() => setStatus(null), 2800);
    return () => window.clearTimeout(t);
  }, []);

  const runCopy = useCallback(async () => {
    const result = await copyTextToClipboard(plain);
    flash(result.ok ? "Chat copied" : result.reason);
    setOpen(false);
  }, [plain, flash]);

  const runShare = useCallback(async () => {
    const result = await shareText({
      title: conversationTitle || "Giga3 AI chat",
      text: plain.slice(0, 12_000),
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });
    flash(result.ok ? "Shared" : result.reason);
    setOpen(false);
  }, [plain, conversationTitle, flash]);

  const runTxt = useCallback(() => {
    const slug = (conversationTitle || "chat")
      .replace(/[^\w-]+/g, "-")
      .slice(0, 40);
    downloadTextFile(`giga3-${slug || "chat"}.txt`, plain);
    flash("Downloaded TXT");
    setOpen(false);
  }, [plain, conversationTitle, flash]);

  const runPdf = useCallback(() => {
    try {
      openChatPrintView(messages, { title: conversationTitle });
      flash("Use Print → Save as PDF");
    } catch (e) {
      flash(e instanceof Error ? e.message : "PDF export failed");
    }
    setOpen(false);
  }, [messages, conversationTitle, flash]);

  const empty = messages.length === 0;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled || empty}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm hover:bg-zinc-50 disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Share</span>
        <ChevronDown className="h-4 w-4 opacity-60" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-white py-1 shadow-lg"
        >
          <MenuItem icon={Copy} label="Copy chat" onClick={() => void runCopy()} />
          <MenuItem icon={Share2} label="Share chat" onClick={() => void runShare()} />
          <MenuItem icon={FileText} label="Export as TXT" onClick={runTxt} />
          <MenuItem icon={Printer} label="Export as PDF" onClick={runPdf} />
        </div>
      )}

      {status && (
        <p
          className="absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-lg bg-zinc-900 px-2 py-1 text-xs text-white"
          role="status"
        >
          {status}
        </p>
      )}
    </div>
  );
});

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-foreground hover:bg-zinc-50"
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
      {label}
    </button>
  );
}
