"use client";

import { ChatInputToolbar } from "@/components/chat/ChatInputToolbar";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { Button } from "@/components/ui/Button";
import {
  buildUserDisplayContent,
  prepareChatAttachment,
  type PreparedChatAttachment,
  type AttachmentKind,
} from "@/lib/chat/multimodalAttachments";
import {
  formatUploadBytes,
  type UploadUsageSnapshot,
} from "@/lib/chat/uploadLimits";
import { Send, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FormEvent,
  KeyboardEvent,
  MutableRefObject,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface ChatInputProps {
  onSend: (message: string, attachments?: PreparedChatAttachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Parent can call `.current(text)` to insert templates into the textarea. */
  insertRef?: MutableRefObject<((text: string) => void) | null>;
  uploadUsage?: UploadUsageSnapshot | null;
  onAttachmentsChange?: (attachments: PreparedChatAttachment[]) => void;
  onSuggestVisionTier?: () => void;
}

export const ChatInput = memo(function ChatInput({
  onSend,
  disabled,
  placeholder = "Message Giga3 AI…",
  insertRef,
  uploadUsage,
  onAttachmentsChange,
  onSuggestVisionTier,
}: ChatInputProps) {
  useRenderDiagnostic("ChatInput");

  const [value, setValue] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PreparedChatAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const insertText = useCallback((text: string) => {
    setValue((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${text}` : text));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!insertRef) return;
    insertRef.current = (text: string) => {
      insertText(text);
      setNotice("Template inserted — edit below, then send.");
    };
    return () => {
      insertRef.current = null;
    };
  }, [insertRef, insertText]);

  useEffect(() => {
    if (!toolbarOpen) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (composerRef.current && target && !composerRef.current.contains(target)) {
        setToolbarOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [toolbarOpen]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    onAttachmentsChange?.(attachments);
  }, [attachments, onAttachmentsChange]);

  useEffect(() => {
    const hasVisual = attachments.some(
      (a) => a.kind === "image" || a.kind === "pdf" || a.kind === "document"
    );
    if (hasVisual) onSuggestVisionTier?.();
  }, [attachments, onSuggestVisionTier]);

  async function handlePickFiles(files: File[], kind: AttachmentKind) {
    if (disabled || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const currentFiles = attachments.length;
      const currentImages = attachments.filter((a) => a.kind === "image").length;
      if (uploadUsage) {
        const nextImages = files.filter((file) => file.type.startsWith("image/")).length;
        if (currentFiles + files.length > uploadUsage.filesRemaining) {
          throw new Error(
            `Only ${uploadUsage.filesRemaining} file upload${uploadUsage.filesRemaining === 1 ? "" : "s"} remaining today.`
          );
        }
        if (currentImages + nextImages > uploadUsage.imagesRemaining) {
          throw new Error(
            `Only ${uploadUsage.imagesRemaining} image upload${uploadUsage.imagesRemaining === 1 ? "" : "s"} remaining today.`
          );
        }
      }

      const prepared = await Promise.all(
        files.map((file) => prepareChatAttachment(file, uploadUsage?.limits))
      );
      setAttachments((prev) => [...prev, ...prepared]);
      setNotice(
        `Attached ${prepared.length} file${prepared.length === 1 ? "" : "s"}. Ask what you want Giga3 AI to analyze, summarize, solve, compare, or explain.`
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not attach file.");
    } finally {
      setBusy(false);
    }
  }

  const handlePickFilesRef = useRef(handlePickFiles);
  handlePickFilesRef.current = handlePickFiles;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        void handlePickFilesRef.current(imageFiles, "image");
      }
    }
    el.addEventListener("paste", onPaste);
    return () => el.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    return () => {
      for (const attachment of attachments) {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, [attachments]);

  const canSend = Boolean(value.trim() || attachments.length > 0);

  function submit() {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled || busy) return;
    const displayContent = buildUserDisplayContent(trimmed, attachments);
    onSend(displayContent, attachments);
    setValue("");
    for (const attachment of attachments) {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachments([]);
    setNotice(null);
    setToolbarOpen(false);
    setEmojiOpen(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape" && toolbarOpen) {
      setToolbarOpen(false);
    }
  }

  const inputDisabled = disabled || busy;
  const showUploadHint =
    attachments.length > 0 ||
    (uploadUsage != null &&
      (uploadUsage.filesRemaining < 20 || uploadUsage.imagesRemaining < 10));

  return (
    <form
      onSubmit={handleSubmit}
      className="chat-composer min-w-0 max-w-full px-3 py-2 sm:px-4 sm:py-3"
    >
      <div className="chat-thread space-y-2">
        {notice && (
          <NoticeBanner message={notice} onDismiss={() => setNotice(null)} />
        )}

        {attachments.length > 0 && (
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-card p-2">
            {attachments.map((attachment, index) => (
              <AttachmentChip
                key={`${attachment.name}-${index}`}
                attachment={attachment}
                onRemove={() => {
                  setAttachments((prev) => {
                    const next = prev.filter((_, i) => i !== index);
                    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
                    return next;
                  });
                }}
              />
            ))}
          </div>
        )}

        <div
          ref={composerRef}
          className={cn(
            "chat-composer-surface relative flex items-end gap-1.5 rounded-[1.75rem] border bg-card p-1.5 shadow-sm transition-colors sm:gap-2 sm:p-2",
            dragOver ? "border-accent/50 bg-accent/5" : "border-border"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const files = Array.from(e.dataTransfer.files ?? []);
            if (files.length) void handlePickFiles(files, "file");
          }}
        >
          <ChatInputToolbar
            disabled={inputDisabled}
            expanded={toolbarOpen}
            onToggle={() => {
              setToolbarOpen((open) => !open);
              setEmojiOpen(false);
            }}
            onPickFiles={(files, kind) => void handlePickFiles(files, kind)}
            onError={(msg) => setNotice(msg)}
            onVoiceTranscript={(text) => insertText(text)}
          />

          <div className="relative min-w-0 flex-1">
            <EmojiPicker
              open={emojiOpen}
              onClose={() => setEmojiOpen(false)}
              onPick={(emoji) => setValue((prev) => prev + emoji)}
            />
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                requestAnimationFrame(() => {
                  textareaRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
                });
              }}
              disabled={inputDisabled}
              rows={1}
              placeholder={placeholder}
              className="chat-composer-textarea max-h-40 min-h-10 w-full resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 text-base leading-[1.5] text-foreground outline-none placeholder:text-muted focus:ring-0 disabled:opacity-50"
              aria-label="Chat message"
            />
          </div>

          <button
            type="button"
            disabled={inputDisabled}
            aria-label="Insert emoji"
            onClick={() => {
              setEmojiOpen((open) => !open);
              setToolbarOpen(false);
            }}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-accent/10"
          >
            <Smile className="h-5 w-5" aria-hidden />
          </button>

          <Button
            type="submit"
            disabled={inputDisabled || !canSend}
            size="md"
            className={cn(
              "h-10 shrink-0 rounded-full px-3 transition-all",
              canSend ? "w-10 min-w-10" : "w-10 min-w-10 opacity-50"
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <p className="hidden px-2 text-center text-[11px] leading-relaxed text-muted/70 sm:block">
          Giga3 AI can make mistakes. Check important information.
        </p>
        {showUploadHint && uploadUsage && (
          <p className="px-2 text-center text-[11px] text-muted/70">
            {uploadUsage.filesRemaining} files · {uploadUsage.imagesRemaining} images left today
            {attachments.length > 0 ? ` · max ${formatUploadBytes(uploadUsage.limits.maxFileBytes)}` : ""}
          </p>
        )}
      </div>
    </form>
  );
});

function NoticeBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-start justify-between gap-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <span>{message}</span>
      <button
        type="button"
        className="touch-target shrink-0 rounded-lg text-amber-800 hover:bg-amber-100"
        aria-label="Dismiss notice"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: PreparedChatAttachment;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground">
      {attachment.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.previewUrl}
          alt=""
          className="h-7 w-7 rounded-md object-cover"
        />
      ) : null}
      <span className="min-w-0">
        <span className="block max-w-[10rem] truncate font-medium">
          {attachment.name}
        </span>
        <span className="block text-muted">
          {attachment.kind} · {formatUploadBytes(attachment.sizeBytes)}
        </span>
      </span>
      <button
        type="button"
        className="rounded-md p-1 text-muted hover:bg-accent/10 hover:text-foreground"
        aria-label={`Remove ${attachment.name}`}
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  );
}
