/**
 * Unified Creator toolkit — merges home quick actions and professional tool catalog
 * with priority ordering and optional teleprompter pin.
 */

import {
  CREATOR_HOME_ACTIONS,
  type CreatorHomeAction,
} from "@/lib/gigaedit/creatorStudio/homeActions";
import {
  GIGAEDIT_TOOL_CATALOG,
  toolsForCategory,
  type GigaEditCatalogTool,
  type GigaEditToolCategory,
} from "@/lib/gigaedit/toolCatalog";

export const TELEPROMPTER_PIN_STORAGE_KEY = "giga3_gigaedit_teleprompter_pinned";

/** Default priority for voiceover creators (row 1–2). */
export const TOOLKIT_PRIORITY_IDS = [
  "teleprompter",
  "record-voice",
  "ai-photo-editor",
  "ai-video-editor",
] as const;

export type CreatorToolkitFilter = GigaEditToolCategory | "all";

export type CreatorToolkitItem =
  | {
      kind: "action";
      action: CreatorHomeAction;
      category: GigaEditToolCategory;
    }
  | {
      kind: "tool";
      tool: GigaEditCatalogTool;
      category: GigaEditToolCategory;
    };

const HOME_ACTION_CATEGORY: Partial<Record<string, GigaEditToolCategory>> = {
  "new-project": "create",
  "import-video": "create",
  "import-images": "photo",
  "record-video": "create",
  "record-voice": "create",
  "generate-ai": "generate",
  "recent-projects": "studio",
  templates: "studio",
  "brand-kit": "studio",
};

/** Home actions omitted from merged toolkit (redundant or navigational). */
const EXCLUDED_HOME_ACTION_IDS = new Set(["recent-projects", "record-video"]);

export function isTeleprompterPinned(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(TELEPROMPTER_PIN_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
}

export function setTeleprompterPinned(pinned: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TELEPROMPTER_PIN_STORAGE_KEY, pinned ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function homeActionCategory(action: CreatorHomeAction): GigaEditToolCategory {
  return HOME_ACTION_CATEGORY[action.id] ?? "create";
}

function toolkitItemId(item: CreatorToolkitItem): string {
  return item.kind === "action" ? item.action.id : item.tool.id;
}

function compareByPriority(a: CreatorToolkitItem, b: CreatorToolkitItem): number {
  const aId = toolkitItemId(a);
  const bId = toolkitItemId(b);
  const aIdx = TOOLKIT_PRIORITY_IDS.indexOf(aId as (typeof TOOLKIT_PRIORITY_IDS)[number]);
  const bIdx = TOOLKIT_PRIORITY_IDS.indexOf(bId as (typeof TOOLKIT_PRIORITY_IDS)[number]);
  if (aIdx !== -1 || bIdx !== -1) {
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  }
  return 0;
}

/** Build merged toolkit list for a category filter. */
export function buildCreatorToolkitItems(
  filter: CreatorToolkitFilter,
  pinned = isTeleprompterPinned()
): CreatorToolkitItem[] {
  const actions: CreatorToolkitItem[] = CREATOR_HOME_ACTIONS
    .filter((action) => !EXCLUDED_HOME_ACTION_IDS.has(action.id))
    .map((action) => ({
      kind: "action" as const,
      action,
      category: homeActionCategory(action),
    }));

  const tools: CreatorToolkitItem[] = GIGAEDIT_TOOL_CATALOG.map((tool) => ({
    kind: "tool" as const,
    tool,
    category: tool.category,
  }));

  let merged = [...actions, ...tools];

  if (filter !== "all") {
    merged = merged.filter((item) => item.category === filter);
  }

  merged.sort((a, b) => {
    const pinnedBoost =
      (pinned && toolkitItemId(a) === "teleprompter" ? -100 : 0) -
      (pinned && toolkitItemId(b) === "teleprompter" ? -100 : 0);
    if (pinnedBoost !== 0) return pinnedBoost;
    return compareByPriority(a, b);
  });

  return merged;
}

export function creatorToolkitFilterLabels(): { id: CreatorToolkitFilter; label: string }[] {
  return [
    { id: "all", label: "All" },
    { id: "create", label: "Create" },
    { id: "photo", label: "Photo AI" },
    { id: "video", label: "Video" },
    { id: "generate", label: "Generate" },
  ];
}

export function countToolsForFilter(filter: CreatorToolkitFilter): number {
  return buildCreatorToolkitItems(filter).length;
}
