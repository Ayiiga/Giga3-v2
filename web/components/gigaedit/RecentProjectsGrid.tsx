"use client";

import {
  computeProjectDurationSec,
  formatProjectDuration,
  formatRelativeEditedAt,
  projectKindEmoji,
  projectStatusLabel,
  resolutionLabelForAspect,
} from "@/lib/gigaedit/creatorStudio";
import {
  deleteGigaEditProject,
  duplicateGigaEditProject,
  estimateProjectBlobBytes,
  formatStorageBytes,
  listGigaEditProjects,
  saveGigaEditProject,
  sectionForProjectKind,
  type GigaEditProjectRecord,
} from "@/lib/gigaedit/projects";
import { getCachedThumbnail, primeThumbnailCache } from "@/lib/gigaedit/thumbnailCache";
import type { GigaEditOpenOptions, GigaEditSection } from "@/lib/gigaedit/types";
import { cn } from "@/lib/utils";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type RecentProjectsGridProps = {
  limit?: number;
  onOpen: (section: GigaEditSection, opts?: GigaEditOpenOptions) => void;
  onViewAll?: () => void;
  compact?: boolean;
};

type PendingDelete = {
  project: GigaEditProjectRecord;
  bytes: number;
};

export function RecentProjectsGrid({
  limit = 6,
  onOpen,
  onViewAll,
  compact,
}: RecentProjectsGridProps) {
  const [projects, setProjects] = useState<GigaEditProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const refresh = useCallback(async () => {
    const rows = await listGigaEditProjects();
    primeThumbnailCache(rows);
    setProjects(rows.slice(0, limit));
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function confirmDelete(project: GigaEditProjectRecord) {
    const bytes = await estimateProjectBlobBytes(project.id);
    setPendingDelete({ project, bytes });
  }

  async function executeDelete() {
    if (!pendingDelete) return;
    await deleteGigaEditProject(pendingDelete.project.id);
    setPendingDelete(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(pendingDelete.project.id);
      return next;
    });
    await refresh();
  }

  async function deleteSelected() {
    const ids = [...selected];
    for (const id of ids) {
      await deleteGigaEditProject(id);
    }
    setSelected(new Set());
    setSelectMode(false);
    await refresh();
  }

  async function saveRename(project: GigaEditProjectRecord) {
    const title = renameDraft.trim();
    if (!title) return;
    await saveGigaEditProject({ ...project, title });
    setRenamingId(null);
    setRenameDraft("");
    await refresh();
  }

  if (loading) {
    return (
      <p className="text-xs text-[var(--ge-muted)]" aria-live="polite">
        Loading recent projects…
      </p>
    );
  }

  if (projects.length === 0) {
    return (
      <p className="text-xs text-[var(--ge-muted)]">
        No drafts yet. Import a video or start a new project — everything auto-saves locally.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="text-[10px] font-medium text-[var(--ge-gold)]"
          onClick={() => {
            setSelectMode((v) => !v);
            setSelected(new Set());
          }}
        >
          {selectMode ? "Cancel select" : "Select"}
        </button>
      </div>

      <div className={cn(compact ? "space-y-2" : "gigaedit-recent-grid")}>
        {projects.map((project) => (
          <RecentProjectCard
            key={project.id}
            project={project}
            onOpen={onOpen}
            compact={compact}
            selectMode={selectMode}
            selected={selected.has(project.id)}
            onToggleSelect={() =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(project.id)) next.delete(project.id);
                else next.add(project.id);
                return next;
              })
            }
            onDelete={() => void confirmDelete(project)}
            onDuplicate={() => void duplicateGigaEditProject(project.id).then(refresh)}
            onRename={() => {
              setRenamingId(project.id);
              setRenameDraft(project.title);
            }}
            renaming={renamingId === project.id}
            renameDraft={renameDraft}
            onRenameDraftChange={setRenameDraft}
            onSaveRename={() => void saveRename(project)}
            onCancelRename={() => setRenamingId(null)}
          />
        ))}
      </div>

      {selectMode && selected.size > 0 ? (
        <div className="gigaedit-recent-bulk-bar flex items-center justify-between gap-2 rounded-xl border border-red-400/30 bg-red-950/30 px-3 py-2">
          <span className="text-xs text-white/80">{selected.size} selected</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white"
            onClick={() => void deleteSelected()}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete selected
          </button>
        </div>
      ) : null}

      {onViewAll && projects.length >= limit ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-[var(--ge-gold)]"
          onClick={onViewAll}
        >
          View all projects
        </button>
      ) : null}

      {pendingDelete ? (
        <div className="gigaedit-delete-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="gigaedit-glass max-w-sm space-y-3 p-4">
            <p className="text-sm font-semibold">
              Delete draft {pendingDelete.project.title}?
            </p>
            <p className="text-xs text-[var(--ge-muted)]">
              This frees {formatStorageBytes(pendingDelete.bytes)} locally. Original file preserved
              until you confirm delete.
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
                onClick={() => void executeDelete()}
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

function RecentProjectCard({
  project,
  onOpen,
  compact,
  selectMode,
  selected,
  onToggleSelect,
  onDelete,
  onDuplicate,
  onRename,
  renaming,
  renameDraft,
  onRenameDraftChange,
  onSaveRename,
  onCancelRename,
}: {
  project: GigaEditProjectRecord;
  onOpen: RecentProjectsGridProps["onOpen"];
  compact?: boolean;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  renaming: boolean;
  renameDraft: string;
  onRenameDraftChange: (v: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
}) {
  const durationSec = computeProjectDurationSec(project);
  const resolution = resolutionLabelForAspect(project.aspectRatio);
  const thumbSrc = getCachedThumbnail(project.id) ?? project.thumbnailDataUrl ?? undefined;
  const [revealed, setRevealed] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);

  return (
    <div
      className={cn(
        "gigaedit-recent-card-wrap relative overflow-hidden rounded-xl",
        revealed && "gigaedit-recent-card-wrap--revealed"
      )}
      onTouchStart={() => {
        longPressTimerRef.current = window.setTimeout(() => setRevealed(true), 450);
      }}
      onTouchEnd={() => {
        if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
      }}
    >
      <div
        className="gigaedit-recent-card-actions"
        aria-hidden={!revealed}
      >
        <button type="button" className="gigaedit-recent-action gigaedit-recent-action--delete" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
        <button type="button" className="gigaedit-recent-action" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
          Duplicate
        </button>
        <button type="button" className="gigaedit-recent-action" onClick={onRename}>
          <Pencil className="h-4 w-4" />
          Rename
        </button>
      </div>

      <div
        className={cn(
          "gigaedit-recent-card w-full text-left transition-transform",
          compact && "gigaedit-recent-card--compact",
          revealed && "-translate-x-36"
        )}
      >
        {selectMode ? (
          <input
            type="checkbox"
            className="mr-2 shrink-0"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${project.title}`}
          />
        ) : null}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-stretch gap-3 text-left"
          onClick={() =>
            onOpen(sectionForProjectKind(project.kind) as GigaEditSection, {
              projectId: project.id,
              aspect: project.aspectRatio,
            })
          }
        >
          <div className="gigaedit-recent-card__thumb" aria-hidden>
            {thumbSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <span className="text-2xl">{projectKindEmoji(project.kind)}</span>
            )}
          </div>
          <div className="gigaedit-recent-card__body min-w-0 flex-1">
            {renaming ? (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  value={renameDraft}
                  onChange={(e) => onRenameDraftChange(e.target.value)}
                  className="gigaedit-input w-full text-sm"
                />
                <button type="button" className="text-[10px] text-[var(--ge-gold)]" onClick={onSaveRename}>
                  Save
                </button>
                <button type="button" className="text-[10px] text-[var(--ge-muted)]" onClick={onCancelRename}>
                  Cancel
                </button>
              </div>
            ) : (
              <p className="truncate text-sm font-semibold">{project.title}</p>
            )}
            <p className="mt-0.5 text-[11px] text-[var(--ge-muted)]">
              {formatProjectDuration(durationSec)} · {resolution} · {formatRelativeEditedAt(project.updatedAt)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="gigaedit-recent-card__badge">{projectStatusLabel(project.status)}</span>
              <span className="text-[10px] uppercase tracking-wide text-[var(--ge-muted)]">
                {project.kind}
              </span>
              {project.aiAssisted ? (
                <span className="text-[10px] text-[var(--ge-gold)]">AI-assisted</span>
              ) : null}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
