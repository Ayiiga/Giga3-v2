"use client";

import { OfflineManager } from "@/components/gigaedit/OfflineManager";
import { RecentProjectsGrid } from "@/components/gigaedit/RecentProjectsGrid";
import {
  CREATOR_HOME_ACTIONS,
  CREATOR_STUDIO_PRODUCT_NAME,
  featuredCreatorHomeActions,
  type CreatorHomeAction,
} from "@/lib/gigaedit/creatorStudio";
import {
  featuredGigaEditTools,
  GIGAEDIT_TOOL_CATEGORIES,
  resolveGigaEditToolHref,
  toolsForCategory,
  type GigaEditCatalogTool,
  type GigaEditToolCategory,
} from "@/lib/gigaedit/toolCatalog";
import type { GigaEditOpenOptions, GigaEditSection } from "@/lib/gigaedit/types";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type GigaEditHomeProps = {
  onOpen: (section: GigaEditSection, opts?: GigaEditOpenOptions) => void;
};

function launchHomeAction(action: CreatorHomeAction, onOpen: GigaEditHomeProps["onOpen"]) {
  if (action.kind === "media") {
    if (typeof window !== "undefined") window.location.assign("/media/");
    return;
  }
  if (action.section) {
    onOpen(action.section, {
      autoImport: action.openFlags?.autoImport,
      record: action.openFlags?.record,
    });
  }
}

function launchTool(
  tool: GigaEditCatalogTool,
  onOpen: GigaEditHomeProps["onOpen"]
) {
  if ((tool.kind === "section" || tool.kind === "local") && tool.section) {
    onOpen(tool.section);
    return;
  }
  const href = resolveGigaEditToolHref(tool);
  if (href && typeof window !== "undefined") {
    window.location.assign(href);
  }
}

function ToolCard({
  tool,
  onOpen,
  large,
}: {
  tool: GigaEditCatalogTool;
  onOpen: GigaEditHomeProps["onOpen"];
  large?: boolean;
}) {
  const isMedia = tool.kind === "media";
  return (
    <button
      type="button"
      className={cn("gigaedit-action-tile gigaedit-tool-card", large && "gigaedit-tool-card--featured")}
      onClick={() => launchTool(tool, onOpen)}
    >
      <span className="gigaedit-tool-card__icon" aria-hidden>
        {tool.emoji}
      </span>
      <span className="gigaedit-tool-card__label">{tool.label}</span>
      <span className="gigaedit-tool-card__desc">{tool.description}</span>
      {isMedia ? (
        <span className="gigaedit-tool-card__badge">AI Studio</span>
      ) : (
        <span className="gigaedit-tool-card__badge gigaedit-tool-card__badge--local">On device</span>
      )}
    </button>
  );
}

function HomeActionTile({
  action,
  onOpen,
}: {
  action: CreatorHomeAction;
  onOpen: GigaEditHomeProps["onOpen"];
}) {
  const isMedia = action.kind === "media";
  return (
    <button
      type="button"
      className={cn(
        "gigaedit-action-tile gigaedit-tool-card",
        action.featured && "gigaedit-tool-card--featured"
      )}
      onClick={() => launchHomeAction(action, onOpen)}
    >
      <span className="gigaedit-tool-card__icon" aria-hidden>
        {action.emoji}
      </span>
      <span className="gigaedit-tool-card__label">{action.label}</span>
      <span className="gigaedit-tool-card__desc">{action.description}</span>
      {isMedia ? (
        <span className="gigaedit-tool-card__badge">AI Studio</span>
      ) : (
        <span className="gigaedit-tool-card__badge gigaedit-tool-card__badge--local">On device</span>
      )}
    </button>
  );
}

export function GigaEditHome({ onOpen }: GigaEditHomeProps) {
  const [category, setCategory] = useState<GigaEditToolCategory | "all">("all");
  const featuredActions = useMemo(() => featuredCreatorHomeActions(), []);
  const featured = useMemo(() => featuredGigaEditTools(), []);
  const catalog = useMemo(
    () =>
      category === "all"
        ? GIGAEDIT_TOOL_CATEGORIES.flatMap((c) => toolsForCategory(c.id))
        : toolsForCategory(category),
    [category]
  );

  return (
    <div className="gigaedit-home space-y-6">
      <header className="gigaedit-hero gigaedit-glass space-y-3 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ge-gold)]">
          {CREATOR_STUDIO_PRODUCT_NAME}
        </p>
        <h1 className="gigaedit-hero__title text-3xl font-bold tracking-tight sm:text-4xl">
          Your unified creator workspace
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--ge-muted)] sm:text-base">
          Video, audio, text, captions, branding, and AI — connected in one honest studio. Edit
          on-device, then open AI Studio for cloud generation when you need it.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="gigaedit-cta" onClick={() => onOpen("video")}>
            New project
          </button>
          <button
            type="button"
            className="gigaedit-cta gigaedit-cta--ghost"
            onClick={() => onOpen("video", { autoImport: true })}
          >
            Import video
          </button>
          <button
            type="button"
            className="gigaedit-cta gigaedit-cta--ghost"
            onClick={() => onOpen("brand")}
          >
            Brand kit
          </button>
        </div>
      </header>

      <OfflineManager compact />

      <section aria-labelledby="gigaedit-creator-actions">
        <div className="mb-2 flex items-end justify-between gap-2">
          <h2 id="gigaedit-creator-actions" className="text-sm font-semibold sm:text-base">
            Creator actions
          </h2>
          <p className="text-[11px] text-[var(--ge-muted)]">{CREATOR_HOME_ACTIONS.length} tools</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-3">
          {featuredActions.map((action) => (
            <HomeActionTile key={action.id} action={action} onOpen={onOpen} />
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CREATOR_HOME_ACTIONS.filter((a) => !a.featured).map((action) => (
            <HomeActionTile key={action.id} action={action} onOpen={onOpen} />
          ))}
        </div>
      </section>

      <section aria-labelledby="gigaedit-recent" className="gigaedit-glass p-4 sm:p-5">
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
        <RecentProjectsGrid limit={4} onOpen={onOpen} onViewAll={() => onOpen("projects")} />
      </section>

      <section aria-labelledby="gigaedit-featured">
        <div className="mb-2 flex items-end justify-between gap-2">
          <h2 id="gigaedit-featured" className="text-sm font-semibold sm:text-base">
            Featured AI tools
          </h2>
          <p className="text-[11px] text-[var(--ge-muted)]">{featured.length} ready</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onOpen={onOpen} large />
          ))}
        </div>
      </section>

      <section aria-labelledby="gigaedit-pro-tools">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="gigaedit-pro-tools" className="text-sm font-semibold sm:text-base">
            Professional toolkit
          </h2>
          <div
            className="gigaedit-category-rail flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5"
            role="tablist"
            aria-label="Tool categories"
          >
            <button
              type="button"
              role="tab"
              aria-selected={category === "all"}
              className={cn(
                "gigaedit-chip shrink-0",
                category === "all" && "gigaedit-chip--active"
              )}
              onClick={() => setCategory("all")}
            >
              All
            </button>
            {GIGAEDIT_TOOL_CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={category === item.id}
                className={cn(
                  "gigaedit-chip shrink-0",
                  category === item.id && "gigaedit-chip--active"
                )}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {catalog.map((tool) => (
            <ToolCard key={`${tool.category}-${tool.id}`} tool={tool} onOpen={onOpen} />
          ))}
        </div>
      </section>
    </div>
  );
}
