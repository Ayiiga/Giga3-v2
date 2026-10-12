export type GigaEditTemplate = {
  id: string;
  title: string;
  category: "video" | "photo" | "social" | "business";
  description: string;
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  offline: boolean;
  aiLabel: boolean;
};

/**
 * Creator Growth Starter Pack — exactly three existing registry IDs.
 * These are format starters (aspect + title seed into an empty project),
 * not full timeline layouts. Do not invent additional IDs here.
 */
export const GIGAEDIT_STARTER_PACK_IDS = ["hook-reel", "yt-intro", "poster-promo"] as const;

export type GigaEditStarterPackId = (typeof GIGAEDIT_STARTER_PACK_IDS)[number];

export const GIGAEDIT_TEMPLATES: GigaEditTemplate[] = [
  {
    id: "hook-reel",
    title: "Hook Reel",
    category: "video",
    description:
      "Start a vertical 9:16 video project for Reels, TikTok, or Shorts. Import your clip, add on-screen text, then export.",
    aspectRatio: "9:16",
    offline: true,
    aiLabel: false,
  },
  {
    id: "yt-intro",
    title: "YouTube Intro",
    category: "video",
    description:
      "Start a 16:9 landscape video project sized for YouTube. Import footage, set a title overlay, then export.",
    aspectRatio: "16:9",
    offline: true,
    aiLabel: false,
  },
  {
    id: "poster-promo",
    title: "Promo Poster",
    category: "photo",
    description:
      "Start a 4:5 photo project for posters and feed posts. Import an image, adjust filters or title text, then export PNG.",
    aspectRatio: "4:5",
    offline: true,
    aiLabel: true,
  },
  {
    id: "thumb-click",
    title: "Thumbnail Creator",
    category: "photo",
    description:
      "Start a 16:9 photo project for video thumbnails. Import an image, add a short title, then export PNG.",
    aspectRatio: "16:9",
    offline: true,
    aiLabel: true,
  },
  {
    id: "flyer-biz",
    title: "Business Flyer",
    category: "business",
    description:
      "Start a 4:5 photo project for a simple flyer. Import artwork or a photo, add title text, then export PNG.",
    aspectRatio: "4:5",
    offline: true,
    aiLabel: true,
  },
  {
    id: "carousel-square",
    title: "IG Carousel Cover",
    category: "social",
    description:
      "Start a 1:1 square video project for Instagram covers and feed clips. Import a clip, add text, then export.",
    aspectRatio: "1:1",
    offline: true,
    aiLabel: false,
  },
];

/** Ordered Starter Pack templates — always the three IDs above from the shared registry. */
export function getGigaEditStarterPackTemplates(): GigaEditTemplate[] {
  return GIGAEDIT_STARTER_PACK_IDS.map((id) => {
    const template = GIGAEDIT_TEMPLATES.find((t) => t.id === id);
    if (!template) {
      throw new Error(`GigaEdit Starter Pack missing template id: ${id}`);
    }
    return template;
  });
}

/** Remaining catalog templates not in the Starter Pack (same registry, no duplicates). */
export function getGigaEditMoreTemplates(): GigaEditTemplate[] {
  const starter = new Set<string>(GIGAEDIT_STARTER_PACK_IDS);
  return GIGAEDIT_TEMPLATES.filter((t) => !starter.has(t.id));
}
