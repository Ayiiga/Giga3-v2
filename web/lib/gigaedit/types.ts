export type GigaEditSection =
  | "home"
  | "video"
  | "photo"
  | "teleprompter"
  | "script"
  | "templates"
  | "audio"
  | "social"
  | "projects"
  | "ai";

export type GigaEditProjectKind =
  | "video"
  | "photo"
  | "teleprompter"
  | "audio"
  | "social"
  | "template";

export type GigaEditProjectStatus = "draft" | "ready" | "exported";

export type ExportAspectRatio = "9:16" | "16:9" | "1:1" | "4:5" | "4:3";

/** Options when opening a GigaEdit section (projects / templates / social formats). */
export type GigaEditOpenOptions = {
  projectId?: string;
  aspect?: ExportAspectRatio;
};

export type GigaEditProjectMeta = {
  id: string;
  title: string;
  kind: GigaEditProjectKind;
  status: GigaEditProjectStatus;
  createdAt: number;
  updatedAt: number;
  aspectRatio: ExportAspectRatio;
  /** AI-assisted assets are always labeled for the user. */
  aiAssisted: boolean;
  thumbnailDataUrl?: string;
  notes?: string;
  /** Original media kept separately — never overwritten. */
  hasOriginal: boolean;
  offlineReady: boolean;
};

/** Maximum number of source videos that can be joined in one GigaEdit project. */
export const MAX_GIGAEDIT_JOIN_CLIPS = 10;

export type GigaEditTimelineClip = {
  id: string;
  track: "video" | "audio" | "text" | "sticker" | "effect";
  label: string;
  /** Position on the joined timeline. */
  startSec: number;
  endSec: number;
  speed: number;
  rotateDeg: number;
  filterId: string;
  text?: string;
  /** Key for a joined source file (`sourceFiles` map / IndexedDB clip blob). */
  sourceKey?: string;
  /** In-point within the source file (defaults to 0). */
  sourceStartSec?: number;
  /** Out-point within the source file (defaults to full source duration). */
  sourceEndSec?: number;
};

export type GigaEditQuickAction = {
  id: GigaEditSection;
  label: string;
  emoji: string;
  description: string;
};

export const GIGAEDIT_QUICK_ACTIONS: GigaEditQuickAction[] = [
  { id: "video", label: "New Video", emoji: "🎥", description: "CapCut-style timeline editor" },
  { id: "photo", label: "Edit Photo", emoji: "📷", description: "Enhance, crop, and design" },
  { id: "teleprompter", label: "Teleprompter", emoji: "🎤", description: "Scroll scripts while you record" },
  { id: "script", label: "AI Script", emoji: "📝", description: "Hooks, scripts, and captions" },
  { id: "templates", label: "Templates", emoji: "🎨", description: "Ready-made creator layouts" },
  { id: "audio", label: "Audio Studio", emoji: "🎵", description: "Record and sync audio" },
  { id: "social", label: "Social Media Creator", emoji: "📱", description: "Export for TikTok, YT, IG" },
  { id: "projects", label: "My Projects", emoji: "📂", description: "Drafts and local backups" },
];

export const EXPORT_FORMATS: {
  id: string;
  label: string;
  aspectRatio: ExportAspectRatio;
  platform: string;
}[] = [
  { id: "tiktok", label: "TikTok / Reels", aspectRatio: "9:16", platform: "TikTok" },
  { id: "youtube", label: "YouTube", aspectRatio: "16:9", platform: "YouTube" },
  { id: "ig-square", label: "Instagram Square", aspectRatio: "1:1", platform: "Instagram" },
  { id: "ig-portrait", label: "Instagram 4:5", aspectRatio: "4:5", platform: "Instagram" },
  { id: "facebook", label: "Facebook", aspectRatio: "4:3", platform: "Facebook" },
];
