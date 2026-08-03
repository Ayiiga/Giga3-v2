"use client";

import {
  createEmptyProject,
  deleteGigaEditProject,
  duplicateGigaEditProject,
  exportProjectJson,
  listGigaEditProjects,
  saveGigaEditProject,
  sectionForProjectKind,
  type GigaEditProjectRecord,
} from "@/lib/gigaedit/projects";
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

  const refresh = useCallback(async () => {
    setProjects(await listGigaEditProjects());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My projects</h2>
          <p className="mt-1 text-xs text-[var(--ge-muted)]">
            Auto-save drafts in IndexedDB. Open, duplicate, export JSON, or delete — originals stay
            private.
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
                onClick={() =>
                  void deleteGigaEditProject(p.id).then(() => {
                    setMessage("Project deleted from this device.");
                    return refresh();
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
