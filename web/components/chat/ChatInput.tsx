"use client";

import { ChatInputToolbar } from "@/components/chat/ChatInputToolbar";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { Button } from "@/components/ui/Button";
import {
  buildAttachmentMessage,
  type AttachmentKind,
} from "@/lib/chat/fileAttachments";
import { Send, X } from "lucide-react";
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
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Parent can call `.current(text)` to insert templates into the textarea. */
  insertRef?: MutableRefObject<((text: string) => void) | null>;
}

export const ChatInput = memo(function ChatInput({
  onSend,
  disabled,
  placeholder = "Message Giga3 AI…",
  insertRef,
}: ChatInputProps) {
  useRenderDiagnostic("ChatInput");

  const [value, setValue] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
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

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled || busy) return;
    onSend(trimmed);
    setValue("");
    setNotice(null);
    setToolbarOpen(false);
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

  async function handlePickFile(file: File, kind: AttachmentKind) {
    if (disabled || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const prefix = await buildAttachmentMessage(file, kind);
      insertText(prefix);
      setNotice(`Attached ${file.name}. Add details below, then send.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not attach file.");
    } finally {
      setBusy(false);
    }
  }

  const inputDisabled = disabled || busy;

  return (
    <form
      onSubmit={handleSubmit}
      className="chat-composer border-t border-zinc-100 bg-zinc-50/80 px-3 py-3 sm:px-5 sm:py-4"
    >
      <div className="mx-auto max-w-3xl space-y-2">
        {notice && (
          <NoticeBanner message={notice} onDismiss={() => setNotice(null)} />
        )}

        <div ref={composerRef} className="relative flex items-end gap-2">
          <ChatInputToolbar
            disabled={inputDisabled}
            expanded={toolbarOpen}
            onToggle={() => setToolbarOpen((open) => !open)}
            onPickFile={(file, kind) => void handlePickFile(file, kind)}
            onError={(msg) => setNotice(msg)}
          />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={inputDisabled}
            rows={1}
            placeholder={placeholder}
            className="max-h-36 min-h-[3rem] flex-1 resize-none overflow-y-auto rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[0.9375rem] leading-snug text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 sm:min-h-[3.25rem] sm:px-5 sm:text-base"
            aria-label="Chat message"
          />

          <Button
            type="submit"
            disabled={inputDisabled || !value.trim()}
            size="lg"
            className="min-h-12 min-w-12 shrink-0 rounded-2xl px-4 sm:min-h-[3.25rem] sm:min-w-[3.25rem]"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <p className="text-center text-[11px] text-zinc-500 sm:text-xs">
          Enter to send · Shift+Enter for new line ·{" "}
          <button
            type="button"
            className="font-medium text-violet-700 underline-offset-2 hover:underline"
            onClick={() => setToolbarOpen(true)}
          >
            Attach
          </button>{" "}
          for files & media
        </p>
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
      className="flex items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm"
    >
      <span>{message}</span>
      <button
        type="button"
        className="shrink-0 rounded-lg p-1.5 text-amber-800 hover:bg-amber-100"
        aria-label="Dismiss notice"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
