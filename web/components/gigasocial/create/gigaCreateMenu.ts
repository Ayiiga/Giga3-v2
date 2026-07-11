export type GigaCreateActionId =
  | "video-studio"
  | "photo-studio"
  | "text-post"
  | "remix"
  | "ai-enhance"
  | "learning-post"
  | "product-post"
  | "live-content";

export type GigaCreateMenuItem = {
  id: GigaCreateActionId;
  label: string;
  emoji: string;
  description: string;
  disabled?: boolean;
};

export const GIGA_CREATE_MENU: GigaCreateMenuItem[] = [
  {
    id: "video-studio",
    label: "Video Studio",
    emoji: "🎥",
    description: "Record or upload a video",
  },
  {
    id: "photo-studio",
    label: "Photo Studio",
    emoji: "📸",
    description: "Share photos with camera filters and optional music",
  },
  {
    id: "text-post",
    label: "Create Text Post",
    emoji: "✍️",
    description: "Write an update or story",
  },
  {
    id: "remix",
    label: "Remix Content",
    emoji: "🎵",
    description: "Tap Remix on a post in your feed",
  },
  {
    id: "ai-enhance",
    label: "AI Enhance",
    emoji: "🤖",
    description: "Improve caption and hashtags",
  },
  {
    id: "learning-post",
    label: "Learning Post",
    emoji: "📚",
    description: "Share educational content",
  },
  {
    id: "product-post",
    label: "Product Post",
    emoji: "🛒",
    description: "Showcase something you sell",
  },
  {
    id: "live-content",
    label: "Live Stream",
    emoji: "🔴",
    description: "Go live with video, audio, or screen share",
  },
];
