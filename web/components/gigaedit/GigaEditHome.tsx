"use client";

import "./GigaEditHome.css";
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
import {
  ArrowUpRight, AudioLines, Clapperboard, ImagePlus, Layers3, Lightbulb,
  Mic2, Pin, PinOff, Plus, Sparkles, WandSparkles, Zap,
} from "lucide-react";
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

function launchTool(tool: GigaEditCatalogTool, onOpen: GigaEditHomeProps["onOpen"]) {
  if ((tool.kind === "section" || tool.kind === "local") && tool.section) {
    onOpen(tool.section);
    return;
  }
  const href = resolveGigaEditToolHref(tool);
  if (href && typeof window !== "undefined") window.location.assign(href);
}

function ToolkitCard({
  item, onOpen, teleprompterPinned, onTogglePin,
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
    <article className={cn("ge-tool-card", (featured || isTeleprompter) && "ge-tool-card--featured")}>
      <button type="button" className="ge-tool-card__main" onClick={() =>
        item.kind === "action" ? launchHomeAction(item.action, onOpen) : launchTool(item.tool, onOpen)
      }>
        <span className="ge-tool-card__icon" aria-hidden>{emoji}</span>
        <span className="ge-tool-card__name">{label}</span>
        <span className="ge-tool-card__description">{description}</span>
        <span className={cn("ge-tool-card__tag", !isMedia && "ge-tool-card__tag--local")}>
          {isMedia ? "AI Studio" : "On device"}
        </span>
      </button>
      {isTeleprompter ? (
        <button type="button" className="ge-tool-card__pin"
          aria-label={teleprompterPinned ? "Unpin teleprompter" : "Pin teleprompter to top"}
          aria-pressed={teleprompterPinned} onClick={onTogglePin}>
          {teleprompterPinned ? <Pin size={14} /> : <PinOff size={14} />}
        </button>
      ) : null}
    </article>
  );
}

const START_ACTIONS = [
  { id: "video", title: "Video edit", detail: "Trim, captions & effects", icon: Clapperboard, section: "video" as const, tone: "violet" },
  { id: "photo", title: "Photo design", detail: "Polish images & visuals", icon: ImagePlus, section: "photo" as const, tone: "blue" },
  { id: "audio", title: "Audio studio", detail: "Voice, sound & music", icon: AudioLines, section: "audio" as const, tone: "gold" },
  { id: "teleprompter", title: "Record & speak", detail: "Create with confidence", icon: Mic2, section: "teleprompter" as const, tone: "pink" },
];

export function GigaEditHome({ onOpen }: GigaEditHomeProps) {
  const [category, setCategory] = useState<CreatorToolkitFilter>("create");
  const [teleprompterPinned, setTeleprompterPinnedState] = useState(isTeleprompterPinned);
  const togglePin = useCallback(() => {
    setTeleprompterPinnedState((prev) => {
      const next = !prev;
      setTeleprompterPinned(next);
      return next;
    });
  }, []);
  const catalog = useMemo(() => buildCreatorToolkitItems(category, teleprompterPinned), [category, teleprompterPinned]);
  const toolCount = useMemo(() => countToolsForFilter(category), [category]);
  const filters = useMemo(() => creatorToolkitFilterLabels(), []);
  const solidPanels = useMemo(() => shouldUseSolidPanels(), []);

  return (
    <div className={cn("gigaedit-home ge-creator-home", solidPanels && "gigaedit-solid-panels")}>
      <header className="ge-welcome">
        <div className="ge-welcome__topline">
          <span className="ge-brand-mark"><Sparkles size={15} /> GIGA</span>
          <span className="ge-local-pill"><span /> Your creative space</span>
        </div>
        <p className="ge-eyebrow">{CREATOR_STUDIO_PRODUCT_NAME}</p>
        <h2>Make something <span>remarkable.</span></h2>
        <p className="ge-welcome__copy">Your ideas deserve to be seen. Create videos, design visuals and bring every story to life.</p>
        <div className="ge-welcome__actions">
          <button type="button" className="ge-primary-action" onClick={() => onOpen("video", { autoImport: true })}>
            <Plus size={18} /> Start creating <ArrowUpRight size={17} />
          </button>
          <button type="button" className="ge-secondary-action" onClick={() => onOpen("projects")}>
            <Layers3 size={17} /> My projects
          </button>
        </div>
        <div className="ge-welcome__spark"><WandSparkles size={54} strokeWidth={1.1} /></div>
      </header>

      <section className="ge-start-section" aria-labelledby="ge-start-heading">
        <div className="ge-section-heading">
          <div><p className="ge-kicker">MAKE IT YOURS</p><h2 id="ge-start-heading">What are we creating today?</h2></div>
          <span className="ge-step-label"><Zap size={13} /> Quick start</span>
        </div>
        <div className="ge-start-grid">
          {START_ACTIONS.map(({ id, title, detail, icon: Icon, section, tone }) => (
            <button key={id} type="button" className={`ge-start-card ge-start-card--${tone}`} onClick={() => onOpen(section)}>
              <span className="ge-start-card__icon"><Icon size={22} /></span>
              <span className="ge-start-card__title">{title}</span>
              <span className="ge-start-card__detail">{detail}</span>
              <ArrowUpRight className="ge-start-card__arrow" size={16} />
            </button>
          ))}
        </div>
      </section>

      <section className="ge-projects-panel" aria-labelledby="gigaedit-recent">
        <div className="ge-section-heading ge-section-heading--compact">
          <div><p className="ge-kicker">PICK UP WHERE YOU LEFT OFF</p><h2 id="gigaedit-recent">Your recent work</h2></div>
          <button type="button" className="ge-text-link" onClick={() => onOpen("projects")}>View all <ArrowUpRight size={15} /></button>
        </div>
        <RecentProjectsGrid limit={4} onOpen={onOpen} onViewAll={() => onOpen("projects")} />
      </section>

      <div className="ge-device-note"><span className="ge-device-note__icon"><Zap size={16} /></span><div><strong>Your work, your device.</strong><span>drafts save on this device only. AI Studio uses credits</span></div><span className="ge-device-note__status">Ready</span></div>
      <OfflineManager compact />

      <section className="ge-toolkit-section" aria-labelledby="gigaedit-creator-toolkit">
        <div className="ge-section-heading">
          <div><p className="ge-kicker">POWER TO CREATE</p><h2 id="gigaedit-creator-toolkit">Explore your toolkit</h2><p className="ge-section-subtitle">{toolCount} creative tools · On-device tools are free</p></div>
          <span className="ge-toolkit-mark"><WandSparkles size={20} /></span>
        </div>
        <div className="ge-filter-rail" role="tablist" aria-label="Tool categories">
          {filters.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={category === item.id}
              className={cn("ge-filter-chip", category === item.id && "ge-filter-chip--active")}
              onClick={() => setCategory(item.id)}>{item.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {catalog.map((item) => (
            <ToolkitCard key={item.kind === "action" ? `action-${item.action.id}` : `tool-${item.tool.id}`}
              item={item} onOpen={onOpen} teleprompterPinned={teleprompterPinned} onTogglePin={togglePin} />
          ))}
        </div>
      </section>

      <section className="ge-inspiration">
        <div className="ge-inspiration__icon"><Lightbulb size={19} /></div>
        <div><p className="ge-kicker">A LITTLE CREATIVE NUDGE</p><h2>Start with an idea. Finish with a story.</h2><p>One clip, one photo or one voice note is enough to begin.</p></div>
      </section>

      <SurfaceRecommendations surface="edit" title="Suggested editing workflows" limit={4} variant="chips" />
    </div>
  );
}
