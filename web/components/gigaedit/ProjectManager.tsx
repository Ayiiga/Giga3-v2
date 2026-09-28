"use client";

import {
  createEmptyProject,
  deleteProjectAndLocalFiles,
  duplicateGigaEditProject,
  estimateGigaEditStorage,
  estimateGigaEditStorageBytes,
  estimateProjectBlobBytes,
  exportProjectJson,
  formatStorageBytes,
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
import { useCallback, useEffect, useMemo, useState } from "react";

const LOCAL_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;

type ProjectManagerProps = {
  onOpen?: (section: GigaEditSection, opts?: GigaEditOpenOptions) => void;
};

type PendingDelete = {
  projects: GigaEditProjectRecord[];
  bytes: number;
};

export function ProjectManager({ onOpen }: ProjectManagerProps) {
  const [projects, setProjects] = useState<GigaEditProjectRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storageBytes, setStorageBytes] = useState(0);
  const [storageLabel, setStorageLabel] = useState<string>("Checking local storage…");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [showStale, setShowStale] = useState(false);

  const refresh = useCallback(async () => {
    const rows = await listGigaEditProjects();
    setProjects(rows);
    setStorageBytes(await estimateGigaEditStorageBytes());
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

  const stale = useMemo(() => staleDraftSuggestions(projects), [projects]);
  const selectedList = useMemo(
    () => projects.filter((project) => selected.has(project.id)),
    [projects, selected]
  );

  async function estimateDeleteBytes(items: GigaEditProjectRecord[]): Promise<number> {
    const values = await Promise.all(items.map((project) => estimateProjectBlobBytes(project.id)));
    return values.reduce((sum, value) => sum + value, 0);
  }

  async function requestDelete(items: GigaEditProjectRecord[]) {
    if (!items.length) return;
    const bytes = await estimateDeleteBytes(items);
    setPendingDelete({ projects: items, bytes });
  }

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
    if (!pendingDelete?.projects.length) return;
    for (const project of pendingDelete.projects) {
      await deleteProjectAndLocalFiles(project.id);
    }
    setMessage(
      pendingDelete.projects.length === 1
        ? `Deleted ${pendingDelete.projects[0].title} — freed ${formatStorageBytes(pendingDelete.bytes)} locally.`
        : `${pendingDelete.projects.length} drafts deleted — freed ${formatStorageBytes(pendingDelete.bytes)} locally.`
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
            .filter((key) => key.includes("gigaedit") || key.includes("thumbnail"))
            .map((key) => caches.delete(key))
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
            Auto-save drafts in IndexedDB. Open, duplicate, export JSON, or delete — originals stay private.
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-[var(--ge-gold)]" aria-live="polite">
            💾 {storageLabel}
          </p>
          <p className="mt-2 text-[11px] text-[var(--ge-gold)]">
            {formatStorageBytes(storageBytes)} used / {formatStorageBytes(LOCAL_QUOTA_BYTES)} local
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
            setSelectMode((value) => !value);
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
            onClick={() => setShowStale((value) => !value)}
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
            {stale.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-white/80">
                  {project.title} · {new Date(project.updatedAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-red-400/30 px-2 py-1 text-[11px] text-red-300"
                  onClick={() => void requestDelete([project])}
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
            onClick={() => void requestDelete(selectedList)}
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
          {projects.map((project) => {
            const checked = selected.has(project.id);
            return (
              <li key={project.id} className="gigaedit-glass flex flex-wrap items-center gap-2 p-3">
                {selectMode ? (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(project.id)) next.delete(project.id);
                        else next.add(project.id);
                        return next;
                      })
                    }
                    aria-label={`Select ${project.title}`}
                    className="h-4 w-4 accent-[#EAB308]"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{project.title}</p>
                  <p className="text-[11px] text-[var(--ge-muted)]">
                    {project.kind} · {project.aspectRatio} · {new Date(project.updatedAt).toLocaleString()}
                    {project.aiAssisted ? " · AI-assisted" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--ge-border)] px-2 py-2 text-[11px] text-[var(--ge-gold)]"
                  onClick={() =>
                    onOpen?.(sectionForProjectKind(project.kind) as GigaEditSection, {
                      projectId: project.id,
                      aspect: project.aspectRatio,
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
                  aria-label={`Duplicate ${project.title}`}
                  title="Duplicate"
                  onClick={() =>
                    void duplicateGigaEditProject(project.id).then(() => {
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
                  aria-label={`Export ${project.title}`}
                  title="Export JSON"
                  onClick={() => {
                    const blob = new Blob([exportProjectJson(project)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${project.title.replace(/\s+/g, "-").toLowerCase() || "gigaedit"}.json`;
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
                  aria-label={`Delete ${project.title}`}
                  title="Delete (frees local space)"
                  onClick={() => void requestDelete([project])}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pendingDelete?.projects.length ? (
        <div
          className="gigaedit-confirm-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm delete"
        >
          <div className="gigaedit-confirm-card">
            <h3 className="text-sm font-bold text-white">
              Delete
              {pendingDelete.projects.length === 1
                ? ` draft “${pendingDelete.projects[0].title}”?`
                : ` ${pendingDelete.projects.length} drafts?`}
            </h3>
            <p className="mt-1 text-xs text-[var(--ge-muted)]">
              This frees {formatStorageBytes(pendingDelete.bytes)} locally (IndexedDB + device files). Original files stay untouched.
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
