"use client";

import {
  createEmptyProject,
  deleteProjectAndLocalFiles,
  duplicateGigaEditProject,
  estimateGigaEditStorage,
  exportProjectJson,
  listGigaEditProjects,
  saveGigaEditProject,
  sectionForProjectKind,
  staleDraftSuggestions,
  type GigaEditProjectRecord,
} from "@/lib/gigaedit/projects";
import { clearThumbnailCache } from "@/lib/gigaedit/thumbnailCache";
import { enqueueGigaEditSync } from "@/lib/gigaedit/offline";
import type { GigaEditOpenOptions, GigaEditSection } from "@/lib/gigaedit/types";
import { Copy, Download, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ProjectManagerProps = {
  onOpen?: (section: GigaEditSection, opts?: GigaEditOpenOptions) => void;
};

export function ProjectManager({ onOpen }: ProjectManagerProps) {
  const [projects, setProjects] = useState<GigaEditProjectRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storageLabel, setStorageLabel] = useState<string>("Checking local storage…");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<GigaEditProjectRecord[] | null>(null);
  const [showStale, setShowStale] = useState(false);

  const refresh = useCallback(async () => {
    setProjects(await listGigaEditProjects());
    try {
      const estimate = await estimateGigaEditStorage();
      setStorageLabel(estimate.label);
    } catch {
      setStorageLabel("Local storage unavailable");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stale = staleDraftSuggestions(projects);
  const selectedList = projects.filter((p) => selected.has(p.id));

  async function createDraft() {
    setBusy(true);
    try {
      const project = createEmptyProject({ kind: "video", title: "New draft" });
      await saveGigaEditProject(project);
      enqueueGigaEditSync({ projectId: project.id, action: "backup" });
      setMessage("Draft created and saved on this device.");
      await refresh();
      onOpen?.("video", { projectId: project.id, aspect: project.aspectRatio });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete?.length) return;
    for (const p of pendingDelete) {
      await deleteProjectAndLocalFiles(p.id);
    }
    setMessage(
      pendingDelete.length === 1
        ? `Draft “${pendingDelete[0].title}” deleted — space freed on this device.`
        : `${pendingDelete.length} drafts deleted — space freed on this device.`
    );
    setPendingDelete(null);
    setSelected(new Set());
    setSelectMode(false);
    await refresh();
  }

  async function clearCache() {
    clearThumbnailCache();
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.includes("gigaedit") || k.includes("thumbnail"))
            .map((k) => caches.delete(k))
        );
      }
    } catch {
      /* ignore */
    }
    setMessage("Preview cache cleared. Drafts and originals kept.");
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My projects</h2>
          <p className="mt-1 text-xs text-[var(--ge-muted)]">
            Auto-save drafts in IndexedDB. Open, duplicate, export JSON, or delete — originals stay
            private. Draft auto-saved locally. Original file preserved.
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-[var(--ge-gold)]" aria-live="polite">
            💾 {storageLabel}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createDraft()}
          className="inline-flex items-center gap-1 rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-1.5 text-[11px] text-[var(--ge-muted)]"
          onClick={() => {
            setSelectMode((v) => !v);
            setSelected(new Set());
          }}
          aria-pressed={selectMode}
        >
          {selectMode ? "Cancel select" : "Select multiple"}
        </button>
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-1.5 text-[11px] text-[var(--ge-muted)]"
          onClick={() => void clearCache()}
        >
          Clear cache
        </button>
        {stale.length > 0 ? (
          <button
            type="button"
            className="rounded-xl border border-yellow-400/40 px-3 py-1.5 text-[11px] text-yellow-200"
            onClick={() => setShowStale((v) => !v)}
            aria-expanded={showStale}
          >
            {stale.length} draft{stale.length === 1 ? "" : "s"} older than 30 days — review
          </button>
        ) : null}
      </div>

      {showStale && stale.length > 0 ? (
        <div className="gigaedit-glass space-y-2 p-3">
          <p className="text-xs font-semibold text-yellow-200">
            Auto-suggest: these drafts haven&apos;t been touched in 30+ days.
          </p>
          <ul className="space-y-1.5">
            {stale.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-white/80">
                  {p.title} · {new Date(p.updatedAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-red-400/30 px-2 py-1 text-[11px] text-red-300"
                  onClick={() => setPendingDelete([p])}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {selectMode && selectedList.length > 0 ? (
        <div className="gigaedit-select-bar" role="toolbar" aria-label="Bulk project actions">
          <span className="text-xs font-semibold text-white">{selectedList.length} selected</span>
          <button
            type="button"
            className="gigaedit-select-bar__delete"
            onClick={() => setPendingDelete(selectedList)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete selected ({selectedList.length})
          </button>
        </div>
      ) : null}

      {message ? <p className="text-xs text-[var(--ge-gold)]">{message}</p> : null}

      {projects.length === 0 ? (
        <div className="gigaedit-glass p-6 text-center text-sm text-[var(--ge-muted)]">
          No projects yet. Create a draft to start offline.
        </div>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => {
            const checked = selected.has(p.id);
            return (
              <li key={p.id} className="gigaedit-glass flex flex-wrap items-center gap-2 p-3">
                {selectMode ? (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(p.id)) next.delete(p.id);
                        else next.add(p.id);
                        return next;
                      })
                    }
                    aria-label={`Select ${p.title}`}
                    className="h-4 w-4 accent-[#EAB308]"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <p className="text-[11px] text-[var(--ge-muted)]">
                    {p.kind} · {p.aspectRatio} · {new Date(p.updatedAt).toLocaleString()}
                    {p.aiAssisted ? " · AI-assisted" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--ge-border)] px-2 py-2 text-[11px] text-[var(--ge-gold)]"
                  onClick={() =>
                    onOpen?.(sectionForProjectKind(p.kind) as GigaEditSection, {
                      projectId: p.id,
                      aspect: p.aspectRatio,
                    })
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                    Open
                  </span>
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--ge-border)] p-2 text-[var(--ge-muted)]"
                  aria-label={`Duplicate ${p.title}`}
                  title="Duplicate"
                  onClick={() =>
                    void duplicateGigaEditProject(p.id).then(() => {
                      setMessage("Project duplicated.");
                      return refresh();
                    })
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--ge-border)] p-2 text-[var(--ge-muted)]"
                  aria-label={`Export ${p.title}`}
                  title="Export JSON"
                  onClick={() => {
                    const blob = new Blob([exportProjectJson(p)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${p.title.replace(/\s+/g, "-").toLowerCase() || "gigaedit"}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setMessage("Project JSON exported (media blobs stay local).");
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-400/30 p-2 text-red-300"
                  aria-label={`Delete ${p.title}`}
                  title="Delete (frees local space)"
                  onClick={() => setPendingDelete([p])}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pendingDelete?.length ? (
        <div
          className="gigaedit-confirm-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm delete"
        >
          <div className="gigaedit-confirm-card">
            <h3 className="text-sm font-bold text-white">
              Delete {pendingDelete.length === 1 ? `draft “${pendingDelete[0].title}”?` : `${pendingDelete.length} drafts?`}
            </h3>
            <p className="mt-1 text-xs text-[var(--ge-muted)]">
              This frees local space immediately (IndexedDB + device files). Original files stay
              untouched.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="gigaedit-cta gigaedit-cta--ghost flex-1 text-xs"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="gigaedit-confirm-delete flex-1"
                onClick={() => void confirmDelete()}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
