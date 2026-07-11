/** Modular trend dashboard metrics — ready to swap for live analytics later. */

export type TrendMetric = {
  id: string;
  label: string;
  value: string;
  change?: string;
  href?: string;
};

export type TrendDashboardSection = {
  id: string;
  title: string;
  metrics: TrendMetric[];
};

export const TREND_DASHBOARD_SECTIONS: TrendDashboardSection[] = [
  {
    id: "ai-tools",
    title: "Most-used AI tools",
    metrics: [
      { id: "chat", label: "AI Chat", value: "42%", change: "+8%", href: "/chat" },
      { id: "media", label: "Media Studio", value: "18%", change: "+12%", href: "/media" },
      { id: "gigalearn", label: "GigaLearn", value: "15%", change: "+5%", href: "/gigalearn" },
      { id: "creator", label: "Creator Studio", value: "12%", href: "/creator-studio" },
    ],
  },
  {
    id: "prompt-categories",
    title: "Popular prompt categories",
    metrics: [
      { id: "education", label: "Education", value: "24%", href: "/prompts?category=education" },
      { id: "coding", label: "Programming", value: "21%", href: "/prompts?category=programming" },
      { id: "business", label: "Business", value: "17%", href: "/prompts?category=business" },
      { id: "writing", label: "Writing", value: "14%", href: "/prompts?category=writing" },
    ],
  },
  {
    id: "learning-topics",
    title: "Trending educational topics",
    metrics: [
      { id: "bece", label: "BECE prep", value: "High", href: "/gigalearn" },
      { id: "coding-basics", label: "Coding basics", value: "Rising", href: "/prompts?category=programming" },
      { id: "essay", label: "Essay writing", value: "Steady", href: "/prompts?category=writing" },
      { id: "math", label: "Math help", value: "High", href: "/gigalearn" },
    ],
  },
  {
    id: "creator-activity",
    title: "Creator activity",
    metrics: [
      { id: "social-posts", label: "GigaSocial posts", value: "↑", href: "/gigasocial" },
      { id: "images", label: "Images generated", value: "↑", href: "/media" },
      { id: "videos", label: "Videos created", value: "↑", href: "/video" },
      { id: "marketplace", label: "Marketplace listings", value: "↑", href: "/marketplace" },
    ],
  },
  {
    id: "marketplace-trends",
    title: "Marketplace trends",
    metrics: [
      { id: "prompts", label: "AI prompts", value: "Top seller", href: "/marketplace" },
      { id: "templates", label: "Templates", value: "Growing", href: "/marketplace" },
      { id: "courses", label: "Mini-courses", value: "New", href: "/marketplace" },
      { id: "sell", label: "New sellers", value: "+18%", href: "/marketplace/sell" },
    ],
  },
];
