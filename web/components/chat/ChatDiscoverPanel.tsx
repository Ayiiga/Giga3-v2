"use client";

import { runChatCreateAction } from "@/components/chat/ChatCreateHub";
import {
  filterDiscoverTools,
  type ChatCreateActionId,
} from "@/lib/chat/chatCreateMenu";
import type { DocumentTemplateId } from "@/lib/chat/documentTemplates";
import { classifyChatMediaFiles } from "@/lib/chat/chatMediaPicker";
import type { AttachmentKind } from "@/lib/chat/multimodalAttachments";
import { cn } from "@/lib/utils";
import { Search, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export function ChatDiscoverPanel({
  open,
  onClose,
  disabled,
  onPickFiles,
  onSelectDocumentTemplate,
  onInsertTemplate,
  onError,
  onNotice,
}: {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
  onPickFiles: (files: File[], kind: AttachmentKind) => void;
  onSelectDocumentTemplate: (templateId: DocumentTemplateId) => void;
  onInsertTemplate: (text: string) => void;
  onError: (message: string) => void;
  onNotice?: (message: string) => void;
}) {
  const titleId = useId();
  const searchId = useId();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => filterDiscoverTools(query), [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleMediaAction(action: ChatCreateActionId) {
    if (action === "media-video") {
      videoRef.current?.click();
      return;
    }
    if (action === "media-audio") {
      audioRef.current?.click();
      return;
    }
    onError("Use the + menu for Camera, Photos, or Media.");
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: AttachmentKind
  ) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    try {
      if (kind === "file") {
        const intent = classifyChatMediaFiles(files);
        if (intent.kind === "unsupported") {
          onError(intent.reason);
          return;
        }
        onPickFiles(intent.files, intent.kind);
      } else {
        onPickFiles(files, kind);
      }
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not attach file.");
    }
  }

  function handleSelect(action: ChatCreateActionId) {
    // Keep the panel mounted until the native picker returns — closing first
    // unmounts the hidden file inputs and drops the selection.
    if (action === "media-video" || action === "media-audio") {
      handleMediaAction(action);
      return;
    }
    try {
      runChatCreateAction({
        action,
        router,
        onMediaAction: handleMediaAction,
        onSelectDocumentTemplate,
        onInsertTemplate,
        onNotice,
        onClose,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not open that tool.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "flex max-h-[min(88dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl dark:bg-card sm:rounded-3xl",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        )}
      >
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => handleFileChange(e, "video")}
        />
        <input
          ref={audioRef}
          type="file"
          accept="audio/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => handleFileChange(e, "file")}
        />

        <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <Sparkles className="h-5 w-5 text-accent" aria-hidden />
          <h2 id={titleId} className="flex-1 text-base font-semibold text-foreground">
            Discover
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-muted hover:bg-accent/10 hover:text-foreground"
            aria-label="Close Discover"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="shrink-0 px-4 pb-2 pt-3">
          <label htmlFor={searchId} className="sr-only">
            Search tools
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id={searchId}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools…"
              className="min-h-11 w-full rounded-xl border border-border bg-muted/20 py-2 pl-10 pr-3 text-sm text-foreground outline-none ring-accent/30 placeholder:text-muted focus:ring-2"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {sections.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No tools match that search.</p>
          ) : (
            sections.map((section) => (
              <section key={section.id} className="mb-4 last:mb-0" aria-label={section.title}>
                <p className="px-0.5 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {section.title}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        "flex min-h-14 items-start gap-3 rounded-2xl border border-border bg-white p-3 text-left dark:bg-card",
                        "hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                        disabled && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className="text-xl leading-none" aria-hidden>
                        {item.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-muted">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
