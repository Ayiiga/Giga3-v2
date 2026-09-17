"use client";

import {
  createEmptyProject,
  deleteGigaEditProject,
  duplicateGigaEditProject,
  estimateGigaEditStorageBytes,
  estimateProjectBlobBytes,
  exportProjectJson,
  formatStorageBytes,
  listGigaEditProjects,
  saveGigaEditProject,
  sectionForProjectKind,
  type GigaEditProjectRecord,
} from "@/lib/gigaedit/projects";
import { enqueueGigaEditSync } from "@/lib/gigaedit/offline";
import type { GigaEditOpenOptions, GigaEditSection } from "@/lib/gigaedit/types";
import { Copy, Download, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const LOCAL_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;
const OLD_DRAFT_MS = 30 * 24 * 60 * 60 * 1000;

type ProjectManagerProps = {
  onOpen?: (section: GigaEditSection, opts?: GigaEditOpenOptions) => void;
};

type PendingDelete = {
  project: GigaEditProjectRecord;
  bytes: number;
};

export function ProjectManager({ onOpen }: ProjectManagerProps) {
  const [projects, setProjects] = useState<GigaEditProjectRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storageBytes, setStorageBytes] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const refresh = useCallback(async () => {
    setProjects(await listGigaEditProjects());
    setStorageBytes(await estimateGigaEditStorageBytes());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const staleDrafts = useMemo(() => {
    const cutoff = Date.now() - OLD_DRAFT_MS;
    return projects.filter((p) => p.status === "draft" && p.updatedAt < cutoff);
  }, [projects]);

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

  async function requestDelete(project: GigaEditProjectRecord) {
    const bytes = await estimateProjectBlobBytes(project.id);
    setPendingDelete({ project, bytes });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteGigaEditProject(pendingDelete.project.id);
    setPendingDelete(null);
    setMessage(
      `Deleted ${pendingDelete.project.title} — freed ${formatStorageBytes(pendingDelete.bytes)} locally.`
    );
    await refresh();
  }

  async function clearStaleDrafts() {
    for (const draft of staleDrafts) {
      await deleteGigaEditProject(draft.id);
    }
    setMessage(`Removed ${staleDrafts.length} draft(s) older than 30 days.`);
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My projects</h2>
          <p className="mt-1 text-xs text-[var(--ge-muted)]">
            Auto-save drafts in IndexedDB. Open, duplicate, export JSON, or delete — originals stay
            private.
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

      {staleDrafts.length > 0 ? (
        <div className="gigaedit-glass flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
          <span className="text-[var(--ge-muted)]">
            {staleDrafts.length} draft{staleDrafts.length === 1 ? "" : "s"} older than 30 days
          </span>
          <button
            type="button"
            className="rounded-lg border border-red-400/40 px-2 py-1 text-red-300"
            onClick={() => void clearStaleDrafts()}
          >
            Clear old drafts
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
          {projects.map((p) => (
            <li key={p.id} className="gigaedit-glass flex flex-wrap items-center gap-2 p-3">
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
                onClick={() => void requestDelete(p)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingDelete ? (
        <div className="gigaedit-delete-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="gigaedit-glass max-w-sm space-y-3 p-4">
            <p className="text-sm font-semibold">Delete draft {pendingDelete.project.title}?</p>
            <p className="text-xs text-[var(--ge-muted)]">
              This frees {formatStorageBytes(pendingDelete.bytes)} locally.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--ge-border)] px-3 py-1.5 text-xs"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white"
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
