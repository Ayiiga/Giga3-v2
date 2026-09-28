/** Media Studio other-tools grid — single source of truth for badges + destinations. */

export type StudioToolRuntime = "ON DEVICE" | "AI STUDIO";

export type StudioTool = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  runtime: StudioToolRuntime;
  /** Credit hint for AI STUDIO tools (image pipeline = 2 credits). */
  creditHint?: string;
  href: string;
};

export const STUDIO_TOOL_RUNTIME_HELP: Record<StudioToolRuntime, string> = {
  "ON DEVICE": "Works offline · free · no credits",
  "AI STUDIO": "Uses credits · 1 GHS = 1 credit",
};

export const MEDIA_STUDIO_TOOLS: StudioTool[] = [
  {
    id: "ai-photo-editor",
    title: "AI Photo Editor",
    description: "Edit photos free on your device",
    emoji: "🖼️",
    runtime: "ON DEVICE",
    href: "/gigaedit/?tab=photo",
  },
  {
    id: "ai-video-editor",
    title: "AI Video Editor",
    description: "Cut, caption and export on-device",
    emoji: "🎬",
    runtime: "ON DEVICE",
    href: "/gigaedit/?tab=video",
  },
  {
    id: "background-remover",
    title: "Background Remover",
    description: "Transparent background in seconds",
    emoji: "✂️",
    runtime: "AI STUDIO",
    creditHint: "2 credits",
    href: "/media/?action=remove-bg",
  },
  {
    id: "background-changer",
    title: "Background Changer",
    description: "Swap in Accra, studio or beach scenes",
    emoji: "🌆",
    runtime: "AI STUDIO",
    creditHint: "2 credits",
    href: "/media/?action=replace-bg",
  },
  {
    id: "object-eraser",
    title: "Object Eraser",
    description: "Remove photobombers and clutter",
    emoji: "🧽",
    runtime: "AI STUDIO",
    creditHint: "2 credits",
    href: "/media/?action=object-remove",
  },
  {
    id: "magic-eraser",
    title: "Magic Eraser",
    description: "One-tap distraction cleanup",
    emoji: "🪄",
    runtime: "AI STUDIO",
    creditHint: "2 credits",
    href: "/media/?action=edit",
  },
  {
    id: "ai-enhance",
    title: "AI Enhance",
    description: "Sharpen dull or noisy photos",
    emoji: "✨",
    runtime: "AI STUDIO",
    creditHint: "2 credits",
    href: "/media/?action=enhance",
  },
  {
    id: "hd-upscale",
    title: "HD Upscale",
    description: "2x resolution for print and posters",
    emoji: "🔍",
    runtime: "AI STUDIO",
    creditHint: "2 credits",
    href: "/media/?action=upscale",
  },
  {
    id: "face-enhancement",
    title: "Face Enhancement",
    description: "Natural retouch for portraits",
    emoji: "🙂",
    runtime: "AI STUDIO",
    creditHint: "2 credits",
    href: "/media/?action=face-enhance",
  },
  {
    id: "skin-retouch",
    title: "Skin Retouch",
    description: "Smooth, even-toned skin finish",
    emoji: "💆",
    runtime: "AI STUDIO",
    creditHint: "2 credits",
    href: "/media/?action=skin-retouch",
  },
];
