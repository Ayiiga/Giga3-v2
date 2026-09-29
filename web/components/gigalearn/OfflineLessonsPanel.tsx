"use client";

import { Button } from "@/components/ui/Button";
import {
  formatOfflineStorageHint,
  listOfflineLessons,
  removeOfflineLesson,
  type OfflineLessonPack,
} from "@/lib/gigalearn/offlineLessons";
import { useCallback, useEffect, useState } from "react";

interface OfflineLessonsPanelProps {
  /** Save the current artifact explicitly for offline study. */
  onSaveCurrent?: () => Promise<void> | void;
  currentTitle?: string;
}

export function OfflineLessonsPanel({
  onSaveCurrent,
  currentTitle,
}: OfflineLessonsPanelProps) {
  const [lessons, setLessons] = useState<OfflineLessonPack[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLessons(await listOfflineLessons());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSave() {
    if (!onSaveCurrent) return;
    setBusy(true);
    try {
      await onSaveCurrent();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    await removeOfflineLesson(id);
    await refresh();
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Offline lessons</h2>
      <p className="mt-1 text-xs text-muted">
        Save text lessons on this device. AI generation still needs a connection.
      </p>
      <p className="mt-2 text-xs font-medium text-muted">{formatOfflineStorageHint(lessons.length)}</p>
      {onSaveCurrent ? (
        <Button
          type="button"
          size="sm"
          className="mt-3 min-h-11"
          disabled={busy}
          onClick={() => void handleSave()}
        >
          Save for offline{currentTitle ? `: ${currentTitle.slice(0, 40)}` : ""}
        </Button>
      ) : null}
      {lessons.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {lessons.slice(0, 8).map((lesson) => (
            <li
              key={lesson.id}
              className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">{lesson.title || "Saved lesson"}</span>
              <button
                type="button"
                className="shrink-0 text-xs text-muted underline"
                onClick={() => void handleRemove(lesson.id)}
              >
                Remove offline copy
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
