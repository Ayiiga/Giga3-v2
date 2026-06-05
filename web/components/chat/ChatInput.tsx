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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled || busy) return;
    onSend(trimmed);
    setValue("");
    setNotice(null);
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
      className="chat-composer p-3 sm:p-5"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <ChatInputToolbar
          disabled={inputDisabled}
          onPickFile={(file, kind) => void handlePickFile(file, kind)}
          onError={(msg) => setNotice(msg)}
        />

        {notice && (
          <NoticeBanner message={notice} onDismiss={() => setNotice(null)} />
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={inputDisabled}
            rows={1}
            placeholder={placeholder}
            className="max-h-40 min-h-[56px] flex-1 resize-none overflow-y-auto rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-base font-medium text-black outline-none ring-violet-500 focus:ring-2 disabled:opacity-50 sm:min-h-[60px] sm:text-lg placeholder:text-zinc-500"
            aria-label="Chat message"
          />
          <Button
            type="submit"
            disabled={inputDisabled || !value.trim()}
            size="lg"
            className="min-h-[56px] min-w-[56px] px-5 sm:min-h-[60px] sm:min-w-[60px]"
            aria-label="Send"
          >
            <Send className="h-6 w-6" aria-hidden />
          </Button>
        </div>
      </div>

      <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-muted sm:text-sm">
        Enter to send · Shift+Enter for new line · Attach files or use templates above
      </p>
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
      className="flex items-start justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 sm:text-sm"
    >
      <span>{message}</span>
      <button
        type="button"
        className="shrink-0 rounded p-1 text-foreground hover:bg-zinc-100"
        aria-label="Dismiss notice"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
