"use client";

import type { UiMessage } from "@/components/chat/MessageList";
import {
  downloadConversationMarkdown,
  downloadConversationTxt,
  exportConversationPdf,
  formatConversationPlain,
} from "@/lib/chat/conversationExport";
import { copyTextToClipboard, shareText } from "@/lib/download";
import { cn } from "@/lib/utils";
import { Copy, Download, FileText, Share2 } from "lucide-react";
import { useState } from "react";

interface ChatConversationActionsProps {
  messages: UiMessage[];
  disabled?: boolean;
  className?: string;
}

export function ChatConversationActions({
  messages,
  disabled,
  className,
}: ChatConversationActionsProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const hasContent = messages.some((m) => m.content.trim().length > 0);

  const btn =
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40 sm:min-h-10 sm:px-3 sm:text-sm";

  async function withNotice(action: () => Promise<void>, success: string) {
    setNotice(null);
    try {
      await action();
      setNotice(success);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Action failed");
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 border-b border-border/80 bg-zinc-50/80 px-3 py-2 sm:gap-2 sm:px-4",
        className
      )}
    >
      <span className="mr-1 hidden text-xs font-bold uppercase tracking-wide text-muted sm:inline">
        Chat
      </span>
      <button
        type="button"
        className={btn}
        disabled={disabled || !hasContent}
        onClick={() =>
          void withNotice(async () => {
            await shareText("Giga3 AI Chat", formatConversationPlain(messages));
          }, "Shared")
        }
        aria-label="Share chat"
      >
        <Share2 className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden xs:inline">Share</span>
      </button>
      <button
        type="button"
        className={btn}
        disabled={disabled || !hasContent}
        onClick={() =>
          void withNotice(
            () => copyTextToClipboard(formatConversationPlain(messages)),
            "Copied"
          )
        }
        aria-label="Copy chat"
      >
        <Copy className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden xs:inline">Copy</span>
      </button>
      <button
        type="button"
        className={btn}
        disabled={disabled || !hasContent}
        onClick={() => {
          downloadConversationTxt(messages);
          setNotice("TXT downloaded");
        }}
        aria-label="Export chat as TXT"
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden />
        TXT
      </button>
      <button
        type="button"
        className={btn}
        disabled={disabled || !hasContent}
        onClick={() => {
          downloadConversationMarkdown(messages);
          setNotice("Markdown downloaded");
        }}
        aria-label="Export chat as Markdown"
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden />
        MD
      </button>
      <button
        type="button"
        className={btn}
        disabled={disabled || !hasContent}
        onClick={() => {
          try {
            exportConversationPdf(messages);
            setNotice("PDF print dialog opened");
          } catch (e) {
            setNotice(e instanceof Error ? e.message : "PDF export failed");
          }
        }}
        aria-label="Export chat as PDF"
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden />
        PDF
      </button>
      {notice && (
        <span className="text-xs font-medium text-violet-800" role="status">
          {notice}
        </span>
      )}
    </div>
  );
}
