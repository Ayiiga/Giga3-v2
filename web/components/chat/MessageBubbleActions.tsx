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
import {
  isReadAloudActive,
  isReadAloudSupported,
  readAloud,
  stopReadAloud,
} from "@/lib/chat/readAloud";
import { copyMarkdownToClipboard, shareText } from "@/lib/share/clientShare";
import { useShareAction } from "@/hooks/useShareAction";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  FileDown,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Share2,
  Star,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
  onDelete?: () => void;
}

type ActionItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  hidden?: boolean;
};

export const MessageBubbleActions = memo(function MessageBubbleActions({
  messageId,
  role,
  content,
  disabled,
  className,
  onRegenerate,
  onEdit,
  onDelete,
}: MessageBubbleActionsProps) {
  const { feedback, runAction, busy } = useShareAction();
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [favorited, setFavorited] = useState(
    messageId ? isMessageFavorite(messageId) : false
  );

  const copyText = useMemo(
    () => formatMessageForCopy(role, content),
    [role, content]
  );

  useEffect(() => {
    if (!speaking) return;
    const id = window.setInterval(() => {
      if (!isReadAloudActive()) setSpeaking(false);
    }, 400);
    return () => window.clearInterval(id);
  }, [speaking]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

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
    setMenuOpen(false);
  }, [copyText, runAction, flashCopiedIcon]);

  const runShare = useCallback(async () => {
    if (!copyText.trim()) return;
    const payload = formatMessageForShare(role, content);
    await runAction(
      () => shareText({ title: payload.title, text: payload.text }),
      SHARE_SUCCESS
    );
    setMenuOpen(false);
  }, [copyText, content, role, runAction]);

  const runFavorite = useCallback(() => {
    if (!messageId) return;
    setFavorited(toggleMessageFavorite(messageId));
    setMenuOpen(false);
  }, [messageId]);

  const runReadAloud = useCallback(() => {
    if (speaking) {
      stopReadAloud();
      setSpeaking(false);
      setMenuOpen(false);
      return;
    }
    const started = readAloud(copyText);
    if (started) setSpeaking(true);
    setMenuOpen(false);
  }, [copyText, speaking]);

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
      /* pop-up blocked */
    }
    setMenuOpen(false);
  }, [content]);

  const runDelete = useCallback(() => {
    if (!onDelete) return;
    if (!window.confirm("Delete this message and later replies in this chat?")) return;
    onDelete();
    setMenuOpen(false);
  }, [onDelete]);

  if (!messageHasCopyableContent(content) || disabled) return null;

  const actions: ActionItem[] = [
    {
      key: "copy",
      label: copied ? COPY_SUCCESS : "Copy",
      icon: copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />,
      onClick: () => void runCopy(),
      disabled: busy,
    },
    {
      key: "share",
      label: "Share",
      icon: <Share2 className="h-3.5 w-3.5" />,
      onClick: () => void runShare(),
      disabled: busy,
    },
    {
      key: "read",
      label: speaking ? "Stop reading" : "Read aloud",
      icon: speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />,
      onClick: runReadAloud,
      hidden: !isReadAloudSupported(),
    },
    {
      key: "favorite",
      label: favorited ? "Unfavorite" : "Favorite",
      icon: (
        <Star
          className={cn("h-3.5 w-3.5", favorited && "fill-amber-400 text-amber-500")}
        />
      ),
      onClick: runFavorite,
      hidden: !messageId,
    },
    {
      key: "edit",
      label: "Edit",
      icon: <Pencil className="h-3.5 w-3.5" />,
      onClick: () => {
        onEdit?.();
        setMenuOpen(false);
      },
      hidden: !(role === "user" && onEdit),
    },
    {
      key: "pdf",
      label: "Download PDF",
      icon: <FileDown className="h-3.5 w-3.5" />,
      onClick: runDownloadPdf,
      hidden: !canDownloadPdf,
    },
    {
      key: "regenerate",
      label: "Regenerate",
      icon: <RefreshCw className="h-3.5 w-3.5" />,
      onClick: () => {
        onRegenerate?.();
        setMenuOpen(false);
      },
      disabled: busy || disabled,
      hidden: !(role === "assistant" && onRegenerate),
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Trash2 className="h-3.5 w-3.5" />,
      onClick: runDelete,
      danger: true,
      hidden: !(role === "user" && onDelete),
    },
  ].filter((item) => !item.hidden);

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
          "hidden max-w-full flex-wrap items-center gap-0 sm:flex",
          "opacity-0 transition-opacity duration-150",
          "group-hover:opacity-100 group-focus-within:opacity-100"
        )}
      >
        {actions.map((action) => (
          <ActionButton
            key={action.key}
            label={action.label}
            disabled={action.disabled}
            onClick={action.onClick}
            danger={action.danger}
          >
            {action.icon}
          </ActionButton>
        ))}
      </div>

      <div ref={menuRef} className="relative sm:hidden">
        <ActionButton
          label="Message actions"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </ActionButton>
        {menuOpen ? (
          <div
            className={cn(
              "absolute bottom-full z-20 mb-1 min-w-[10.5rem] rounded-xl border border-border bg-card p-1 shadow-lg",
              role === "user" ? "right-0" : "left-0"
            )}
            role="menu"
          >
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={action.onClick}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                  action.danger
                    ? "text-red-600 hover:bg-red-500/10"
                    : "text-foreground hover:bg-accent/10"
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
});

function ActionButton({
  label,
  onClick,
  disabled,
  children,
  danger,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  danger?: boolean;
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
        danger && "hover:bg-red-500/10 hover:text-red-500",
        className
      )}
    >
      {children}
    </button>
  );
}
