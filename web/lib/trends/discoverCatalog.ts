import type { TrendCategoryId } from "@/lib/trends/categories";

export type DiscoverItemKind =
  | "prompt"
  | "education"
  | "creator-tool"
  | "study"
  | "marketplace"
  | "community";

export type DiscoverItem = {
  id: string;
  kind: DiscoverItemKind;
  title: string;
  description: string;
  href: string;
  category: TrendCategoryId;
  badge?: string;
};

/** Static discover feed — replace with API/Convex later via the same shape. */
export const DISCOVER_ITEMS: DiscoverItem[] = [
  {
    id: "prompt-research",
    kind: "prompt",
    title: "Research assistant prompt",
    description: "Summarize sources and cite key findings for any topic.",
    href: "/prompts?category=research",
    category: "education",
    badge: "Popular",
  },
  {
    id: "gigalearn-bece",
    kind: "education",
    title: "BECE & WASSCE prep",
    description: "Practice quizzes, study plans, and homework help on GigaLearn.",
    href: "/gigalearn",
    category: "education",
    badge: "Featured",
  },
  {
    id: "creator-studio",
    kind: "creator-tool",
    title: "Creator Studio",
    description: "Draft posts, scripts, and creative assets with AI.",
    href: "/creator-studio",
    category: "creator-economy",
  },
  {
    id: "media-studio",
    kind: "creator-tool",
    title: "AI image studio",
    description: "Generate and edit images for social and marketing.",
    href: "/media",
    category: "creator-economy",
    badge: "Trending",
  },
  {
    id: "coding-debug",
    kind: "prompt",
    title: "Debug my code",
    description: "Paste errors and get step-by-step fixes.",
    href: "/prompts?category=programming",
    category: "coding",
  },
  {
    id: "marketplace-prompts",
    kind: "marketplace",
    title: "AI prompt packs",
    description: "Browse community prompt templates on the marketplace.",
    href: "/marketplace",
    category: "business",
  },
  {
    id: "gigasocial-discover",
    kind: "community",
    title: "GigaSocial trending",
    description: "See what creators and learners are posting right now.",
    href: "/gigasocial/?tab=discover",
    category: "entertainment",
    badge: "Live",
  },
  {
    id: "study-planner",
    kind: "study",
    title: "Weekly study planner",
    description: "Build a realistic revision schedule before exams.",
    href: "/prompts?category=education",
    category: "education",
  },
  {
    id: "business-plan",
    kind: "prompt",
    title: "One-page business plan",
    description: "Outline your idea, market, and next steps.",
    href: "/prompts?category=business",
    category: "business",
  },
  {
    id: "automation-workflows",
    kind: "creator-tool",
    title: "Automation workflows",
    description: "Chain AI steps for repeatable tasks.",
    href: "/automation",
    category: "technology",
  },
  {
    id: "video-ai",
    kind: "creator-tool",
    title: "Text-to-video",
    description: "Short AI videos for social and presentations.",
    href: "/video",
    category: "entertainment",
  },
  {
    id: "wallet-credits",
    kind: "marketplace",
    title: "Credits & wallet",
    description: "Track usage and top up for more AI sessions.",
    href: "/wallet",
    category: "finance",
  },
];

export const POPULAR_SEARCHES = [
  "AI homework help",
  "Write a professional email",
  "Debug Python code",
  "Business plan template",
  "Social media captions",
  "Study schedule",
  "Image generation prompt",
  "Marketplace templates",
  "GigaLearn quiz",
  "Creator studio ideas",
] as const;

export function filterDiscoverItems(options?: {
  kind?: DiscoverItemKind;
  category?: TrendCategoryId;
}): DiscoverItem[] {
  return DISCOVER_ITEMS.filter((item) => {
    if (options?.kind && item.kind !== options.kind) return false;
    if (options?.category && item.category !== options.category) return false;
    return true;
  });
}
