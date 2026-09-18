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
  deduplicateGigaEditProjects,
  deleteProjectAndLocalFiles,
  duplicateGigaEditProject,
  formatBytes,
  listGigaEditProjects,
  saveGigaEditProject,
  sectionForProjectKind,
  type GigaEditProjectRecord,
} from "@/lib/gigaedit/projects";
import { getCachedThumbnail, primeThumbnailCache } from "@/lib/gigaedit/thumbnailCache";
import type { GigaEditOpenOptions, GigaEditSection } from "@/lib/gigaedit/types";
import { cn } from "@/lib/utils";
import { Copy, Pencil, Share2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type RecentProjectsGridProps = {
  limit?: number;
  onOpen: (section: GigaEditSection, opts?: GigaEditOpenOptions) => void;
  onViewAll?: () => void;
  compact?: boolean;
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
  const [pendingDelete, setPendingDelete] = useState<GigaEditProjectRecord[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const rows = await listGigaEditProjects();
    // Defensive dedup by id (latest updatedAt wins) — guards against
    // duplicate rows like 1001144701 appearing 3x.
    const unique = deduplicateGigaEditProjects(rows);
    primeThumbnailCache(unique);
    setProjects(unique.slice(0, limit));
  }

  useEffect(() => {
    let cancelled = false;
    void refresh().then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once per limit
  }, [limit]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmDelete() {
    if (!pendingDelete?.length) return;
    const ids = pendingDelete.map((p) => p.id);
    for (const id of ids) {
      await deleteProjectAndLocalFiles(id);
    }
    setPendingDelete(null);
    setSelected(new Set());
    setSelectMode(false);
    setNotice(
      ids.length === 1 ? "Draft deleted — local storage freed." : `${ids.length} drafts deleted — local storage freed.`
    );
    await refresh();
  }

  async function handleDuplicate(id: string) {
    await duplicateGigaEditProject(id);
    setNotice("Project duplicated.");
    await refresh();
  }

  async function handleRename(project: GigaEditProjectRecord) {
    const next = window.prompt("Rename draft", project.title);
    if (!next || !next.trim() || next.trim() === project.title) return;
    await saveGigaEditProject({ ...project, title: next.trim() });
    setNotice("Draft renamed.");
    await refresh();
  }

  const selectedCount = selected.size;

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
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--ge-muted)]">
          {projects.length} draft{projects.length === 1 ? "" : "s"} · auto-saved locally
        </p>
        <button
          type="button"
          className="text-[11px] font-medium text-[var(--ge-gold)]"
          onClick={() => {
            setSelectMode((v) => !v);
            setSelected(new Set());
          }}
          aria-pressed={selectMode}
        >
          {selectMode ? "Cancel" : "Select"}
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
            checked={selected.has(project.id)}
            onToggleSelect={() => toggleSelect(project.id)}
            onDelete={() => setPendingDelete([project])}
            onDuplicate={() => void handleDuplicate(project.id)}
            onRename={() => void handleRename(project)}
          />
        ))}
        {onViewAll && projects.length >= limit ? (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-[var(--ge-gold)]"
            onClick={onViewAll}
          >
            View all projects
          </button>
        ) : null}
      </div>

      {selectMode && selectedCount > 0 ? (
        <div className="gigaedit-select-bar" role="toolbar" aria-label="Bulk project actions">
          <span className="text-xs font-semibold text-white">
            {selectedCount} selected
          </span>
          <button
            type="button"
            className="gigaedit-select-bar__delete"
            onClick={() =>
              setPendingDelete(projects.filter((p) => selected.has(p.id)))
            }
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete selected ({selectedCount})
          </button>
        </div>
      ) : null}

      {notice ? <p className="mt-2 text-xs text-[var(--ge-gold)]">{notice}</p> : null}

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
              untouched. Estimated saving: {formatBytes(pendingDelete.length * 25 * 1024 * 1024)}.
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

function RecentProjectCard({
  project,
  onOpen,
  compact,
  selectMode,
  checked,
  onToggleSelect,
  onDelete,
  onDuplicate,
  onRename,
}: {
  project: GigaEditProjectRecord;
  onOpen: RecentProjectsGridProps["onOpen"];
  compact?: boolean;
  selectMode: boolean;
  checked: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: () => void;
}) {
  const durationSec = computeProjectDurationSec(project);
  const resolution = resolutionLabelForAspect(project.aspectRatio);
  const thumbSrc = getCachedThumbnail(project.id) ?? project.thumbnailDataUrl ?? undefined;
  const longPressTimer = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const openProject = () =>
    onOpen(sectionForProjectKind(project.kind) as GigaEditSection, {
      projectId: project.id,
      aspect: project.aspectRatio,
    });

  const menuItems = useMemo(
    () => [
      { id: "open", label: "Open", action: openProject },
      { id: "rename", label: "Rename", action: onRename },
      { id: "duplicate", label: "Duplicate", action: onDuplicate },
      { id: "share", label: "Share to GigaSocial", action: openProject },
      { id: "delete", label: "Delete", action: onDelete, danger: true },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions keyed by project
    [project.id]
  );

  function beginLongPress() {
    if (selectMode) return;
    longPressTimer.current = window.setTimeout(() => setMenuOpen(true), 450);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <div
      className={cn(
        "gigaedit-recent-card w-full text-left",
        compact && "gigaedit-recent-card--compact"
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      {selectMode ? (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleSelect}
          aria-label={`Select ${project.title}`}
          className="mt-1 h-4 w-4 shrink-0 accent-[#EAB308]"
        />
      ) : null}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-stretch gap-3 text-left"
        onClick={() => (selectMode ? onToggleSelect() : openProject())}
        onTouchStart={beginLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onMouseDown={beginLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        aria-label={selectMode ? `Select ${project.title}` : `Open ${project.title}`}
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
          <p className="truncate text-sm font-semibold">{project.title}</p>
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

      {!selectMode ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="rounded-lg border border-[var(--ge-border)] p-2 text-[var(--ge-muted)]"
            aria-label={`Duplicate ${project.title}`}
            title="Duplicate"
            onClick={onDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-400/30 p-2 text-red-300"
            aria-label={`Delete ${project.title}`}
            title="Delete (frees local space)"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {menuOpen ? (
        <div className="gigaedit-card-menu" role="menu" aria-label={`Actions for ${project.title}`}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={cn("gigaedit-card-menu__item", item.danger && "gigaedit-card-menu__item--danger")}
              onClick={() => {
                setMenuOpen(false);
                item.action();
              }}
            >
              {item.id === "rename" ? <Pencil className="h-3.5 w-3.5" aria-hidden /> : null}
              {item.id === "duplicate" ? <Copy className="h-3.5 w-3.5" aria-hidden /> : null}
              {item.id === "share" ? <Share2 className="h-3.5 w-3.5" aria-hidden /> : null}
              {item.id === "delete" ? <Trash2 className="h-3.5 w-3.5" aria-hidden /> : null}
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="gigaedit-card-menu__item"
            onClick={() => setMenuOpen(false)}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
