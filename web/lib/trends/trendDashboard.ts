/** Curated product starting points for /trending — no fabricated percentages or live analytics. */

export type TrendCuratedLink = {
  id: string;
  label: string;
  blurb: string;
  href: string;
};

export type TrendCuratedSection = {
  id: string;
  title: string;
  note: string;
  links: TrendCuratedLink[];
};

export const TREND_CURATED_SECTIONS: TrendCuratedSection[] = [
  {
    id: "ai-tools",
    title: "Explore AI tools",
    note: "Editorial picks — not live usage rankings.",
    links: [
      { id: "chat", label: "AI Chat", blurb: "Fast, Smart, Vision, and Creator modes", href: "/chat" },
      { id: "media", label: "Media Studio", blurb: "Generate and edit images", href: "/media" },
      { id: "gigalearn", label: "GigaLearn", blurb: "Homework help and exam prep", href: "/gigalearn" },
      { id: "creator", label: "Creator Studio", blurb: "Writing and social drafts", href: "/creator-studio" },
    ],
  },
  {
    id: "prompt-categories",
    title: "Prompt library categories",
    note: "Browse saved prompts by topic.",
    links: [
      { id: "education", label: "Education", blurb: "Study and classroom prompts", href: "/prompts?category=education" },
      { id: "coding", label: "Programming", blurb: "Code and debugging helpers", href: "/prompts?category=programming" },
      { id: "business", label: "Business", blurb: "Plans, email, and ops copy", href: "/prompts?category=business" },
      { id: "writing", label: "Writing", blurb: "Essays, blogs, and editing", href: "/prompts?category=writing" },
    ],
  },
  {
    id: "learning-topics",
    title: "Learning starting points",
    note: "Curated links into GigaLearn and prompts.",
    links: [
      { id: "bece", label: "BECE prep", blurb: "Junior High School revision", href: "/gigalearn" },
      { id: "coding-basics", label: "Coding basics", blurb: "Intro programming prompts", href: "/prompts?category=programming" },
      { id: "essay", label: "Essay writing", blurb: "Structured writing help", href: "/prompts?category=writing" },
      { id: "math", label: "Math help", blurb: "Practice and explanations", href: "/gigalearn" },
    ],
  },
  {
    id: "creator-activity",
    title: "Creator workflow",
    note: "Editorial workflow links — not live usage rankings.",
    links: [
      { id: "social-posts", label: "GigaSocial", blurb: "Share posts and follow creators", href: "/gigasocial" },
      { id: "images", label: "Media Studio", blurb: "Images for posts and edits", href: "/media" },
      { id: "videos", label: "Video AI", blurb: "Generate clips for GigaEdit", href: "/video" },
      { id: "gigaedit", label: "GigaEdit", blurb: "Trim, caption, and publish", href: "/gigaedit" },
    ],
  },
  {
    id: "marketplace-trends",
    title: "Marketplace",
    note: "Browse creator listings — sales stats are not shown here.",
    links: [
      { id: "browse", label: "Browse listings", blurb: "Digital products in GHS", href: "/marketplace" },
      { id: "sell", label: "Start selling", blurb: "List PDFs and resources", href: "/marketplace/sell" },
      { id: "academy", label: "Creator Academy", blurb: "Official learning series", href: "/marketplace" },
      { id: "blog", label: "Giga3 Blog", blurb: "Guides for Ghana AI adoption", href: "/blog" },
    ],
  },
];

/** @deprecated Use TREND_CURATED_SECTIONS — kept for import stability during migration. */
export const TREND_DASHBOARD_SECTIONS = TREND_CURATED_SECTIONS;
