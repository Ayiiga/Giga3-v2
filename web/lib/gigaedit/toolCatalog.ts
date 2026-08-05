/**
 * Premium GigaEdit studio tool catalog.
 * Tools map to local editors, Media Studio deep links, or AI chat assist —
 * no new backend contracts.
 */

import {
  buildImageStudioActionUrl,
  type ImageStudioActionId,
} from "@/lib/chat/imageStudioLinks";
import type { GigaEditSection } from "@/lib/gigaedit/types";

export type GigaEditToolKind = "local" | "media" | "chat" | "section";

export type GigaEditToolCategory =
  | "create"
  | "photo"
  | "video"
  | "generate"
  | "studio";

export type GigaEditCatalogTool = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  category: GigaEditToolCategory;
  kind: GigaEditToolKind;
  /** Local GigaEdit section */
  section?: GigaEditSection;
  /** Media Studio action id */
  mediaAction?: ImageStudioActionId;
  /** Chat AI assist handoff topic */
  chatTopic?: string;
  featured?: boolean;
};

export const GIGAEDIT_TOOL_CATEGORIES: {
  id: GigaEditToolCategory;
  label: string;
  blurb: string;
}[] = [
  { id: "create", label: "Create", blurb: "Start a project on-device" },
  { id: "photo", label: "Photo AI", blurb: "Enhance, erase, and relight" },
  { id: "video", label: "Video", blurb: "Timeline, captions, and polish" },
  { id: "generate", label: "Generate", blurb: "Posters, logos, thumbnails" },
  { id: "studio", label: "Studio", blurb: "Scripts, audio, and templates" },
];

/** Professional tool surface — every entry resolves to an existing path. */
export const GIGAEDIT_TOOL_CATALOG: GigaEditCatalogTool[] = [
  // Create
  {
    id: "ai-photo-editor",
    label: "AI Photo Editor",
    description: "Crop, enhance, and design on-device",
    emoji: "📷",
    category: "create",
    kind: "section",
    section: "photo",
    featured: true,
  },
  {
    id: "ai-video-editor",
    label: "AI Video Editor",
    description: "Trim, captions, stickers, export",
    emoji: "🎥",
    category: "create",
    kind: "section",
    section: "video",
    featured: true,
  },
  {
    id: "teleprompter",
    label: "Teleprompter",
    description: "Scroll scripts while you record",
    emoji: "🎤",
    category: "create",
    kind: "section",
    section: "teleprompter",
  },
  {
    id: "audio-studio",
    label: "Audio Studio",
    description: "Record and sync audio tracks",
    emoji: "🎵",
    category: "create",
    kind: "section",
    section: "audio",
  },

  // Photo AI → Media Studio
  {
    id: "background-remover",
    label: "Background Remover",
    description: "Clean cutout for products & portraits",
    emoji: "✂️",
    category: "photo",
    kind: "media",
    mediaAction: "remove-bg",
    featured: true,
  },
  {
    id: "background-changer",
    label: "Background Changer",
    description: "Swap scenes while keeping the subject",
    emoji: "🌅",
    category: "photo",
    kind: "media",
    mediaAction: "replace-bg",
    featured: true,
  },
  {
    id: "object-eraser",
    label: "Object Eraser",
    description: "Remove distractions with AI inpaint",
    emoji: "🪄",
    category: "photo",
    kind: "media",
    mediaAction: "object-remove",
  },
  {
    id: "magic-eraser",
    label: "Magic Eraser",
    description: "Quick cleanup of unwanted details",
    emoji: "✨",
    category: "photo",
    kind: "media",
    mediaAction: "object-remove",
  },
  {
    id: "ai-enhance",
    label: "AI Enhance",
    description: "Lighting, color, and clarity boost",
    emoji: "⚡",
    category: "photo",
    kind: "media",
    mediaAction: "enhance",
    featured: true,
  },
  {
    id: "hd-upscale",
    label: "HD Upscale",
    description: "Sharper detail for large exports",
    emoji: "🔍",
    category: "photo",
    kind: "media",
    mediaAction: "upscale",
  },
  {
    id: "face-enhancement",
    label: "Face Enhancement",
    description: "Natural portrait clarity",
    emoji: "😊",
    category: "photo",
    kind: "media",
    mediaAction: "face-enhance",
  },
  {
    id: "skin-retouch",
    label: "Skin Retouch",
    description: "Soft, natural skin polish",
    emoji: "🧴",
    category: "photo",
    kind: "media",
    mediaAction: "skin-retouch",
  },
  {
    id: "portrait-lighting",
    label: "Portrait Lighting",
    description: "Studio-style face lighting",
    emoji: "💡",
    category: "photo",
    kind: "media",
    mediaAction: "portrait-light",
  },
  {
    id: "ai-color-correction",
    label: "AI Color Correction",
    description: "Balanced tones and contrast",
    emoji: "🎨",
    category: "photo",
    kind: "media",
    mediaAction: "color-correct",
  },
  {
    id: "ai-relighting",
    label: "AI Relighting",
    description: "Re-light scenes for mood",
    emoji: "🔦",
    category: "photo",
    kind: "media",
    mediaAction: "relight",
  },
  {
    id: "blur-background",
    label: "Blur Background",
    description: "Portrait depth-of-field look",
    emoji: "🌫️",
    category: "photo",
    kind: "media",
    mediaAction: "blur-bg",
  },
  {
    id: "remove-noise",
    label: "Remove Noise",
    description: "Clean grainy or low-light shots",
    emoji: "🧹",
    category: "photo",
    kind: "media",
    mediaAction: "denoise",
  },
  {
    id: "restore-old-photos",
    label: "Restore Old Photos",
    description: "Repair faded or damaged images",
    emoji: "🕰️",
    category: "photo",
    kind: "media",
    mediaAction: "restore",
  },
  {
    id: "ai-filters",
    label: "AI Filters",
    description: "Creative style transfer looks",
    emoji: "🧿",
    category: "photo",
    kind: "media",
    mediaAction: "style",
  },
  {
    id: "auto-crop",
    label: "Auto Crop",
    description: "Smart framing in the photo editor",
    emoji: "📐",
    category: "photo",
    kind: "section",
    section: "photo",
  },
  {
    id: "smart-resize",
    label: "Smart Resize",
    description: "Social-ready aspect ratios",
    emoji: "📱",
    category: "photo",
    kind: "section",
    section: "social",
  },

  // Video
  {
    id: "video-captions",
    label: "AI Captions",
    description: "Auto captions on the timeline",
    emoji: "💬",
    category: "video",
    kind: "section",
    section: "video",
  },
  {
    id: "ai-stickers",
    label: "AI Stickers",
    description: "Overlay stickers and text",
    emoji: "🏷️",
    category: "video",
    kind: "section",
    section: "video",
  },

  // Generate
  {
    id: "ai-thumbnail",
    label: "AI Thumbnail Generator",
    description: "Click-worthy cover images",
    emoji: "🖼️",
    category: "generate",
    kind: "media",
    mediaAction: "thumbnail",
    featured: true,
  },
  {
    id: "ai-poster",
    label: "AI Poster Generator",
    description: "Event and promo posters",
    emoji: "🪧",
    category: "generate",
    kind: "media",
    mediaAction: "poster",
  },
  {
    id: "ai-logo",
    label: "AI Logo Generator",
    description: "Simple brand mark concepts",
    emoji: "⬡",
    category: "generate",
    kind: "media",
    mediaAction: "logo",
  },

  // Studio
  {
    id: "ai-script",
    label: "AI Script",
    description: "Hooks, scripts, and captions",
    emoji: "📝",
    category: "studio",
    kind: "section",
    section: "script",
    featured: true,
  },
  {
    id: "templates",
    label: "Trend Templates",
    description: "Ready-made creator layouts",
    emoji: "🎬",
    category: "studio",
    kind: "section",
    section: "templates",
  },
  {
    id: "social-creator",
    label: "Social Export",
    description: "Formats for TikTok, YT, IG",
    emoji: "🚀",
    category: "studio",
    kind: "section",
    section: "social",
  },
  {
    id: "projects",
    label: "My Projects",
    description: "Drafts and local backups",
    emoji: "📂",
    category: "studio",
    kind: "section",
    section: "projects",
  },
];

export function resolveGigaEditToolHref(tool: GigaEditCatalogTool): string | null {
  if (tool.kind === "media" && tool.mediaAction) {
    return buildImageStudioActionUrl(tool.mediaAction);
  }
  if ((tool.kind === "section" || tool.kind === "local") && tool.section) {
    if (tool.section === "home") return "/gigaedit/";
    return `/gigaedit/?tab=${encodeURIComponent(tool.section)}`;
  }
  return null;
}

export function toolsForCategory(
  category: GigaEditToolCategory
): GigaEditCatalogTool[] {
  return GIGAEDIT_TOOL_CATALOG.filter((tool) => tool.category === category);
}

export function featuredGigaEditTools(): GigaEditCatalogTool[] {
  return GIGAEDIT_TOOL_CATALOG.filter((tool) => tool.featured);
}
