"use client";

import type { UiMessage } from "@/components/chat/MessageList";
import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import {
  COPY_SUCCESS,
  EXPORT_SUCCESS,
  SHARE_SUCCESS,
  buildPublicShareUrl,
  conversationExportFilename,
  formatConversationForShare,
  formatConversationMarkdown,
} from "@/lib/chat/chatContentFormat";
import {
  downloadMarkdownFile,
  downloadTextFile,
  openChatPrintView,
} from "@/lib/chat/exportChat";
import {
  copyMarkdownToClipboard,
  copyUrlToClipboard,
  shareText,
} from "@/lib/share/clientShare";
import { useShareAction } from "@/hooks/useShareAction";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Copy,
  FileText,
  Link2,
  Link2Off,
  Printer,
  Share2,
} from "lucide-react";
import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";

export type ChatActionsMenuHandle = {
  copyChat: () => Promise<void>;
  shareChat: () => Promise<void>;
};

interface ChatActionsMenuProps {
  messages: UiMessage[];
  conversationTitle?: string;
  conversationId?: string | null;
  sharePublic?: boolean;
  shareToken?: string | null;
  email?: string;
  disabled?: boolean;
  className?: string;
  onSetPublicShare?: (
    enabled: boolean
  ) => Promise<{ shareToken: string | null; sharePublic: boolean }>;
}

export const ChatActionsMenu = memo(
  forwardRef<ChatActionsMenuHandle, ChatActionsMenuProps>(function ChatActionsMenu(
  {
  messages,
  conversationTitle,
  conversationId,
  sharePublic,
  shareToken,
  email,
  disabled,
  className,
  onSetPublicShare,
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [localShareToken, setLocalShareToken] = useState<string | null>(
    shareToken ?? null
  );
  const [localSharePublic, setLocalSharePublic] = useState(Boolean(sharePublic));
  const rootRef = useRef<HTMLDivElement>(null);
  const { feedback, runAction, busy } = useShareAction();

  useEffect(() => {
    setLocalShareToken(shareToken ?? null);
    setLocalSharePublic(Boolean(sharePublic));
  }, [shareToken, sharePublic]);

  const shareUrl = useMemo(() => {
    if (!localSharePublic || !localShareToken) return undefined;
    return buildPublicShareUrl(localShareToken);
  }, [localSharePublic, localShareToken]);

  const markdown = useMemo(
    () =>
      formatConversationMarkdown(messages, {
        title: conversationTitle,
        email,
        shareUrl,
      }),
    [messages, conversationTitle, email, shareUrl]
  );

  const empty = messages.length === 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const closeMenu = useCallback(() => setOpen(false), []);

  const runCopy = useCallback(async () => {
    if (!markdown.trim()) return;
    await runAction(() => copyMarkdownToClipboard(markdown), COPY_SUCCESS);
    closeMenu();
  }, [markdown, runAction, closeMenu]);

  const runShare = useCallback(async () => {
    if (!markdown.trim()) return;
    const payload = formatConversationForShare(messages, {
      title: conversationTitle,
      email,
      shareUrl,
    });
    await runAction(
      () =>
        shareText({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        }),
      SHARE_SUCCESS
    );
    closeMenu();
  }, [
    markdown,
    messages,
    conversationTitle,
    email,
    shareUrl,
    runAction,
    closeMenu,
  ]);

  const runExportMarkdown = useCallback(() => {
    if (!markdown.trim()) return;
    downloadMarkdownFile(
      conversationExportFilename(conversationTitle, "md"),
      markdown
    );
    void runAction(async () => ({ ok: true as const }), EXPORT_SUCCESS);
    closeMenu();
  }, [markdown, conversationTitle, runAction, closeMenu]);

  const runExportTxt = useCallback(() => {
    if (!markdown.trim()) return;
    downloadTextFile(conversationExportFilename(conversationTitle, "txt"), markdown);
    void runAction(async () => ({ ok: true as const }), EXPORT_SUCCESS);
    closeMenu();
  }, [markdown, conversationTitle, runAction, closeMenu]);

  const runExportPdf = useCallback(async () => {
    try {
      openChatPrintView(messages, { title: conversationTitle });
      await runAction(async () => ({ ok: true as const }), "Use Print → Save as PDF");
    } catch (e) {
      await runAction(
        async () => ({
          ok: false as const,
          reason: e instanceof Error ? e.message : "PDF export failed",
        }),
        EXPORT_SUCCESS
      );
    }
    closeMenu();
  }, [messages, conversationTitle, runAction, closeMenu]);

  const runCopyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    await runAction(() => copyUrlToClipboard(shareUrl), COPY_SUCCESS);
    closeMenu();
  }, [shareUrl, runAction, closeMenu]);

  const togglePublicShare = useCallback(async () => {
    if (!conversationId || !email || !onSetPublicShare) return;
    const enabling = !localSharePublic;
    try {
      const result = await onSetPublicShare(enabling);
      setLocalSharePublic(result.sharePublic);
      setLocalShareToken(result.shareToken);
      if (result.sharePublic && result.shareToken) {
        const url = buildPublicShareUrl(result.shareToken);
        await runAction(() => copyUrlToClipboard(url), COPY_SUCCESS);
      } else {
        await runAction(async () => ({ ok: true as const }), "Public link disabled");
      }
    } catch (e) {
      await runAction(
        async () => ({
          ok: false as const,
          reason: e instanceof Error ? e.message : "Could not update share link",
        }),
        COPY_SUCCESS
      );
    }
    closeMenu();
  }, [
    conversationId,
    email,
    localSharePublic,
    onSetPublicShare,
    runAction,
    closeMenu,
  ]);

  const canManageShareLink = Boolean(conversationId && email && onSetPublicShare);

  useImperativeHandle(
    ref,
    () => ({
      copyChat: runCopy,
      shareChat: runShare,
    }),
    [runCopy, runShare]
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled || empty}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Chat share and export. Shortcuts: Ctrl+Shift+C copy chat, Ctrl+Shift+S share chat"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-10 min-w-10 items-center justify-center gap-0 rounded-xl border border-border bg-white px-2 text-sm font-medium text-foreground shadow-sm hover:bg-zinc-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:min-h-11 sm:gap-1.5 sm:px-3"
      >
        <Share2 className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Share</span>
        <ChevronDown className="hidden h-4 w-4 opacity-60 sm:block" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Chat actions"
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-border bg-white py-1 shadow-lg"
        >
          <MenuItem icon={Copy} label="Copy chat" disabled={busy} onClick={() => void runCopy()} />
          <MenuItem icon={Share2} label="Share chat" disabled={busy} onClick={() => void runShare()} />
          <MenuItem
            icon={FileText}
            label="Export chat (Markdown)"
            disabled={busy}
            onClick={runExportMarkdown}
          />
          <MenuItem icon={FileText} label="Export chat (TXT)" disabled={busy} onClick={runExportTxt} />
          <MenuItem icon={Printer} label="Export chat (PDF)" disabled={busy} onClick={() => void runExportPdf()} />
          {canManageShareLink && (
            <>
              <div className="my-1 border-t border-border" role="separator" />
              {localSharePublic && shareUrl ? (
                <MenuItem
                  icon={Link2}
                  label="Copy public link"
                  onClick={() => void runCopyShareLink()}
                />
              ) : null}
              <MenuItem
                icon={localSharePublic ? Link2Off : Link2}
                label={
                  localSharePublic ? "Disable public link" : "Enable public link"
                }
                onClick={() => void togglePublicShare()}
              />
            </>
          )}
        </div>
      )}

      <ShareActionFeedback feedback={feedback} align="end" className="right-0" />
    </div>
  );
})
);

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-foreground hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none disabled:opacity-50"
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
      {label}
    </button>
  );
}
