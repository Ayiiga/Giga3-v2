"use client";

import type { OfflineLessonPack } from "@/lib/gigalearn/offlineLessons";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type OfflineLessonViewerProps = {
  lesson: OfflineLessonPack | null;
  onClose: () => void;
};

/** Read-only offline lesson viewer — reuses workspace content layout. */
export function OfflineLessonViewer({ lesson, onClose }: OfflineLessonViewerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!lesson) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lesson, onClose]);

  if (!lesson) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-lesson-title"
    >
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              Offline lesson
            </p>
            <h2 id="offline-lesson-title" className="truncate text-base font-semibold text-foreground">
              {lesson.title || "Saved lesson"}
            </h2>
            {lesson.subject ? (
              <p className="mt-1 text-xs text-muted">
                {lesson.subject}
                {lesson.curriculum ? ` · ${lesson.curriculum.toUpperCase()}` : ""}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:bg-muted/20"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {lesson.content}
          </pre>
        </div>
        <footer className="border-t border-border px-4 py-3">
          <p className="text-xs text-muted">
            Saved on this device · AI generation needs a connection.
          </p>
        </footer>
      </div>
    </div>
  );
}
