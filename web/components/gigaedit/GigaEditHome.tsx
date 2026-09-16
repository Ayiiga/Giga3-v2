"use client";

import { OfflineManager } from "@/components/gigaedit/OfflineManager";
import { SurfaceRecommendations } from "@/components/recommendations/SurfaceRecommendations";
import { RecentProjectsGrid } from "@/components/gigaedit/RecentProjectsGrid";
import { CREATOR_STUDIO_PRODUCT_NAME } from "@/lib/gigaedit/creatorStudio";
import {
  buildCreatorToolkitItems,
  countToolsForFilter,
  creatorToolkitFilterLabels,
  isTeleprompterPinned,
  setTeleprompterPinned,
  type CreatorToolkitFilter,
  type CreatorToolkitItem,
} from "@/lib/gigaedit/creatorToolkit";
import {
  resolveGigaEditToolHref,
  type GigaEditCatalogTool,
} from "@/lib/gigaedit/toolCatalog";
import type { CreatorHomeAction } from "@/lib/gigaedit/creatorStudio/homeActions";
import type { GigaEditOpenOptions, GigaEditSection } from "@/lib/gigaedit/types";
import { shouldUseSolidPanels } from "@/lib/gigaedit/lowEndUi";
import { cn } from "@/lib/utils";
import { Pin, PinOff } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

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

function ToolkitCard({
  item,
  onOpen,
  teleprompterPinned,
  onTogglePin,
}: {
  item: CreatorToolkitItem;
  onOpen: GigaEditHomeProps["onOpen"];
  teleprompterPinned: boolean;
  onTogglePin: () => void;
}) {
  const isTeleprompter = item.kind === "tool" && item.tool.id === "teleprompter";
  const isMedia = item.kind === "action" ? item.action.kind === "media" : item.tool.kind === "media";
  const emoji = item.kind === "action" ? item.action.emoji : item.tool.emoji;
  const label = item.kind === "action" ? item.action.label : item.tool.label;
  const description = item.kind === "action" ? item.action.description : item.tool.description;
  const featured = item.kind === "action" ? item.action.featured : item.tool.featured;

  return (
    <div
      className={cn(
        "gigaedit-action-tile gigaedit-tool-card",
        (featured || isTeleprompter) && "gigaedit-tool-card--featured",
        isTeleprompter && "gigaedit-tool-card--teleprompter-top"
      )}
    >
      {isTeleprompter ? (
        <span className="gigaedit-tool-card__top-badge" aria-label="Top priority">
          ★ TOP
        </span>
      ) : null}
      <button
        type="button"
        className="gigaedit-tool-card__hit flex min-h-0 w-full flex-1 flex-col items-start text-left"
        onClick={() =>
          item.kind === "action" ? launchHomeAction(item.action, onOpen) : launchTool(item.tool, onOpen)
        }
      >
        <span className="gigaedit-tool-card__icon" aria-hidden>
          {emoji}
        </span>
        <span className="gigaedit-tool-card__label">{label}</span>
        <span className="gigaedit-tool-card__desc gigaedit-tool-card__desc--compact">{description}</span>
        {isMedia ? (
          <span className="gigaedit-tool-card__badge">AI Studio</span>
        ) : (
          <span className="gigaedit-tool-card__badge gigaedit-tool-card__badge--local">On device</span>
        )}
      </button>
      {isTeleprompter ? (
        <button
          type="button"
          className="gigaedit-tool-card__pin"
          aria-label={teleprompterPinned ? "Unpin teleprompter" : "Pin teleprompter to top"}
          aria-pressed={teleprompterPinned}
          onClick={onTogglePin}
        >
          {teleprompterPinned ? (
            <Pin className="h-3 w-3" aria-hidden />
          ) : (
            <PinOff className="h-3 w-3" aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}

export function GigaEditHome({ onOpen }: GigaEditHomeProps) {
  const [category, setCategory] = useState<CreatorToolkitFilter>("all");
  const [teleprompterPinned, setTeleprompterPinnedState] = useState(isTeleprompterPinned);

  const togglePin = useCallback(() => {
    setTeleprompterPinnedState((prev) => {
      const next = !prev;
      setTeleprompterPinned(next);
      return next;
    });
  }, []);

  const catalog = useMemo(
    () => buildCreatorToolkitItems(category, teleprompterPinned),
    [category, teleprompterPinned]
  );
  const toolCount = useMemo(() => countToolsForFilter(category), [category]);
  const filters = useMemo(() => creatorToolkitFilterLabels(), []);

  const solidPanels = useMemo(() => shouldUseSolidPanels(), []);

  return (
    <div className={cn("gigaedit-home space-y-6", solidPanels && "gigaedit-solid-panels")}>
      <header className="gigaedit-hero gigaedit-glass space-y-2 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ge-gold)]">
          {CREATOR_STUDIO_PRODUCT_NAME}
        </p>
        <h2 className="gigaedit-hero__title text-2xl font-bold tracking-tight sm:text-3xl">
          Create on device
        </h2>
        <p className="max-w-xl text-sm text-[var(--ge-muted)]">
          Video, photo, teleprompter, voice and camera recording — edit on-device, publish when ready.
        </p>
        <div className="flex flex-wrap gap-2 pt-0.5">
          <button type="button" className="gigaedit-cta gigaedit-cta--sm" onClick={() => onOpen("video")}>
            New project
          </button>
          <button
            type="button"
            className="gigaedit-cta gigaedit-cta--ghost gigaedit-cta--sm"
            onClick={() => onOpen("video", { autoImport: true })}
          >
            Import video
          </button>
          <button
            type="button"
            className="gigaedit-cta gigaedit-cta--ghost gigaedit-cta--sm"
            onClick={() => onOpen("brand")}
          >
            Brand kit
          </button>
        </div>
      </header>

      <OfflineManager compact />

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

      <section aria-labelledby="gigaedit-creator-toolkit">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="gigaedit-creator-toolkit" className="text-sm font-semibold sm:text-base">
              Creator toolkit
            </h2>
            <p className="text-[11px] text-[var(--ge-muted)]">{toolCount} tools</p>
          </div>
          <div className="gigaedit-category-rail-wrap relative min-w-0 flex-1 sm:max-w-xl">
            <div
              className="gigaedit-category-rail flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5"
              role="tablist"
              aria-label="Tool categories"
            >
              {filters.map((item) => (
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
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {catalog.map((item) => (
            <ToolkitCard
              key={item.kind === "action" ? `action-${item.action.id}` : `tool-${item.tool.id}`}
              item={item}
              onOpen={onOpen}
              teleprompterPinned={teleprompterPinned}
              onTogglePin={togglePin}
            />
          ))}
        </div>
      </section>

      <SurfaceRecommendations
        surface="edit"
        title="Suggested editing workflows"
        limit={4}
        variant="chips"
      />
    </div>
  );
}
