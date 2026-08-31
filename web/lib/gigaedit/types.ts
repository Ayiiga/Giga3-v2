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
  | "ai"
  | "brand";

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
  /** Open file picker on mount (video/photo import). */
  autoImport?: boolean;
  /** Focus recording UI (teleprompter / audio). */
  record?: boolean;
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
  /** Cached timeline duration in seconds (video/audio). */
  durationSec?: number;
  notes?: string;
  /** Original media kept separately — never overwritten. */
  hasOriginal: boolean;
  offlineReady: boolean;
};

/** Maximum number of source videos that can be joined in one GigaEdit project (main track). */
export const MAX_GIGAEDIT_JOIN_CLIPS = 10;

export type VideoResizeMode = "fit" | "fill" | "cover" | "contain" | "original";

export type VideoMaskShape = "none" | "circle" | "rectangle" | "rounded" | "ellipse";

export type OverlayPositionPreset =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type OverlayLayoutPreset =
  | "pip-25"
  | "pip-40"
  | "pip-50"
  | "pip-75"
  | "side-by-side"
  | "split-top-bottom"
  | "circle-camera"
  | "floating";

export type BrandingAction = "keep" | "crop" | "blur" | "cover" | "replace" | "remove";

export type BrandingSource = "user" | "unknown";

export type GigaEditTimelineClip = {
  id: string;
  track: "video" | "audio" | "text" | "sticker" | "effect";
  label: string;
  /** Position on the project timeline (seconds). */
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
  /** 0 = main sequence; 1+ = overlay video layers. */
  videoLayer?: number;
  /** Main timeline sequence vs composited overlay. */
  clipRole?: "main" | "overlay";
  /** Normalized canvas position (0–1), center anchor. */
  posX?: number;
  posY?: number;
  /** Scale relative to smart-fit box (1 = default fit). */
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  volume?: number;
  muted?: boolean;
  locked?: boolean;
  visible?: boolean;
  resizeMode?: VideoResizeMode;
  /** Normalized crop insets within source (0–1). */
  cropLeft?: number;
  cropTop?: number;
  cropRight?: number;
  cropBottom?: number;
  maskShape?: VideoMaskShape;
  maskFeather?: number;
  /** Manual chroma key (hex). */
  chromaKeyColor?: string;
  chromaKeyTolerance?: number;
  borderWidth?: number;
  borderColor?: string;
  shadowBlur?: number;
  roundedRadius?: number;
  blendMode?: GlobalCompositeOperation;
  /** Per-clip thumbnail for media library (data URL). */
  clipThumbnailDataUrl?: string;
  brandingAction?: BrandingAction;
  brandingSource?: BrandingSource;
  /** Normalized region in frame (0–1). */
  brandingRegion?: { x: number; y: number; w: number; h: number };
  /** Multi-camera foundation id (e.g. cam-a, screen). */
  cameraId?: string;
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
