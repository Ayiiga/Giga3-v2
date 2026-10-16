"use client";

import { ENGAGEMENT_CHECKLIST } from "@/lib/engagement/interests";
import { Check, ListChecks, X } from "lucide-react";
import Link from "next/link";

type FirstSessionChecklistProps = {
  completedIds: string[];
  onDismiss: () => void;
  onMarkComplete: (id: string) => void;
};

/**
 * Dismissible first-session checklist (engagement.checklist).
 * Only renders known actions; does not block navigation.
 */
export function FirstSessionChecklist({
  completedIds,
  onDismiss,
  onMarkComplete,
}: FirstSessionChecklistProps) {
  const done = new Set(completedIds);
  const remaining = ENGAGEMENT_CHECKLIST.filter((item) => !done.has(item.id));
  if (remaining.length === 0) return null;

  return (
    <aside
      className="fixed bottom-[calc(var(--primary-nav-offset,4.5rem)+0.75rem)] left-3 right-3 z-[70] mx-auto max-w-md rounded-2xl border border-border bg-white p-3 shadow-lg sm:left-auto sm:right-4"
      aria-label="Getting started checklist"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ListChecks className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Getting started</p>
            <p className="text-xs text-muted">
              {done.size} of {ENGAGEMENT_CHECKLIST.length} complete
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:bg-muted/40"
          aria-label="Dismiss checklist"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {ENGAGEMENT_CHECKLIST.map((item) => {
          const complete = done.has(item.id);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={() => {
                  if (!complete) onMarkComplete(item.id);
                }}
                className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm hover:bg-accent/5"
              >
                <span
                  className={
                    complete
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white"
                      : "inline-flex h-5 w-5 items-center justify-center rounded-full border border-border"
                  }
                  aria-hidden
                >
                  {complete ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className={complete ? "text-muted line-through" : "text-foreground"}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
