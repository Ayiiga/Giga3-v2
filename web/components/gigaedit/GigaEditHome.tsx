"use client";

import { OfflineManager } from "@/components/gigaedit/OfflineManager";
import { sectionForProjectKind } from "@/lib/gigaedit/projects";
import {
  GIGAEDIT_QUICK_ACTIONS,
  type GigaEditOpenOptions,
  type GigaEditSection,
} from "@/lib/gigaedit/types";
import { listGigaEditProjects, type GigaEditProjectRecord } from "@/lib/gigaedit/projects";
import { useEffect, useState } from "react";

type GigaEditHomeProps = {
  onOpen: (section: GigaEditSection, opts?: GigaEditOpenOptions) => void;
};

export function GigaEditHome({ onOpen }: GigaEditHomeProps) {
  const [recent, setRecent] = useState<GigaEditProjectRecord[]>([]);

  useEffect(() => {
    void listGigaEditProjects().then((rows) => setRecent(rows.slice(0, 4)));
  }, []);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ge-gold)]">
          GigaEdit
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Creator studio</h1>
        <p className="max-w-xl text-sm text-[var(--ge-muted)]">
          Edit video & photos, run a teleprompter, and ship social-ready exports — offline-first on
          your device. Original files are never overwritten.
        </p>
      </header>

      <OfflineManager compact />

      <section aria-labelledby="gigaedit-quick-actions">
        <h2 id="gigaedit-quick-actions" className="mb-2 text-sm font-semibold">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GIGAEDIT_QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className="gigaedit-action-tile"
              onClick={() => onOpen(action.id)}
            >
              <span className="text-xl" aria-hidden>
                {action.emoji}
              </span>
              <span className="text-sm font-semibold">{action.label}</span>
              <span className="text-[11px] leading-snug text-[var(--ge-muted)]">
                {action.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="gigaedit-recent" className="gigaedit-glass p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="gigaedit-recent" className="text-sm font-semibold">
            Recent projects
          </h2>
          <button
            type="button"
            className="text-xs font-medium text-[var(--ge-gold)]"
            onClick={() => onOpen("projects")}
          >
            View all
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-[var(--ge-muted)]">
            No drafts yet. Start a video or photo project — it auto-saves locally.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--ge-border)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-[11px] text-[var(--ge-muted)]">
                    {p.kind} · {p.status}
                    {p.aiAssisted ? " · AI-assisted" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs text-[var(--ge-gold)]"
                  onClick={() =>
                    onOpen(sectionForProjectKind(p.kind) as GigaEditSection, {
                      projectId: p.id,
                      aspect: p.aspectRatio,
                    })
                  }
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
