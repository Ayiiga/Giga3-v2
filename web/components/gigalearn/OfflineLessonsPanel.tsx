"use client";

import { Button } from "@/components/ui/Button";
import { OfflineLessonViewer } from "@/components/gigalearn/OfflineLessonViewer";
import {
  formatOfflineStorageHint,
  getOfflineLesson,
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
  const [viewing, setViewing] = useState<OfflineLessonPack | null>(null);

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

  async function handleOpen(id: string) {
    const lesson = await getOfflineLesson(id);
    if (lesson) setViewing(lesson);
  }

  async function handleRemove(id: string) {
    await removeOfflineLesson(id);
    if (viewing?.id === id) setViewing(null);
    await refresh();
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Offline lessons</h2>
        <p className="mt-1 text-xs text-muted">
          Save text lessons on this device. AI generation still needs a connection.
        </p>
        <p className="mt-2 text-xs font-medium text-muted">
          {formatOfflineStorageHint(lessons.length)}
        </p>
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
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left font-medium text-foreground underline-offset-2 hover:underline"
                  onClick={() => void handleOpen(lesson.id)}
                >
                  {lesson.title || "Saved lesson"}
                </button>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="text-xs text-accent underline"
                    onClick={() => void handleOpen(lesson.id)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted underline"
                    onClick={() => void handleRemove(lesson.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <OfflineLessonViewer lesson={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
