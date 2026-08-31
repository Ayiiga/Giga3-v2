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
  listGigaEditProjects,
  sectionForProjectKind,
  type GigaEditProjectRecord,
} from "@/lib/gigaedit/projects";
import type { GigaEditOpenOptions, GigaEditSection } from "@/lib/gigaedit/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    let cancelled = false;
    void listGigaEditProjects().then((rows) => {
      if (cancelled) return;
      setProjects(rows.slice(0, limit));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [limit]);

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
    <div className={cn(compact ? "space-y-2" : "gigaedit-recent-grid")}>
      {projects.map((project) => (
        <RecentProjectCard key={project.id} project={project} onOpen={onOpen} compact={compact} />
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
  );
}

function RecentProjectCard({
  project,
  onOpen,
  compact,
}: {
  project: GigaEditProjectRecord;
  onOpen: RecentProjectsGridProps["onOpen"];
  compact?: boolean;
}) {
  const durationSec = computeProjectDurationSec(project);
  const resolution = resolutionLabelForAspect(project.aspectRatio);

  return (
    <button
      type="button"
      className={cn(
        "gigaedit-recent-card w-full text-left",
        compact && "gigaedit-recent-card--compact"
      )}
      onClick={() =>
        onOpen(sectionForProjectKind(project.kind) as GigaEditSection, {
          projectId: project.id,
          aspect: project.aspectRatio,
        })
      }
    >
      <div className="gigaedit-recent-card__thumb" aria-hidden>
        {project.thumbnailDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnailDataUrl} alt="" className="h-full w-full object-cover" />
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
  );
}
