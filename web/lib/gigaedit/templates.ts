export type GigaEditTemplate = {
  id: string;
  title: string;
  category: "video" | "photo" | "social" | "business";
  description: string;
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  offline: boolean;
  aiLabel: boolean;
};

export const GIGAEDIT_TEMPLATES: GigaEditTemplate[] = [
  {
    id: "hook-reel",
    title: "Hook Reel",
    category: "video",
    description: "3-beat vertical reel with text hooks and beat markers.",
    aspectRatio: "9:16",
    offline: true,
    aiLabel: false,
  },
  {
    id: "yt-intro",
    title: "YouTube Intro",
    category: "video",
    description: "Clean 16:9 intro with title card and logo safe zone.",
    aspectRatio: "16:9",
    offline: true,
    aiLabel: false,
  },
  {
    id: "poster-promo",
    title: "Promo Poster",
    category: "photo",
    description: "Bold poster layout for events and launches.",
    aspectRatio: "4:5",
    offline: true,
    aiLabel: true,
  },
  {
    id: "thumb-click",
    title: "Thumbnail Creator",
    category: "photo",
    description: "High-contrast thumbnail frame with face-safe crop.",
    aspectRatio: "16:9",
    offline: true,
    aiLabel: true,
  },
  {
    id: "flyer-biz",
    title: "Business Flyer",
    category: "business",
    description: "Local business flyer with CTA and contact block.",
    aspectRatio: "4:5",
    offline: true,
    aiLabel: true,
  },
  {
    id: "carousel-square",
    title: "IG Carousel Cover",
    category: "social",
    description: "Square cover slide for carousel storytelling.",
    aspectRatio: "1:1",
    offline: true,
    aiLabel: false,
  },
];
