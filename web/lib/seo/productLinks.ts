/** Internal links between Giga3 AI products — used for SEO intros and footer navigation. */
export const GIGA3_PRODUCT_LINKS = [
  { href: "/chat", label: "AI Chat" },
  { href: "/gigasocial", label: "GigaSocial" },
  { href: "/gigaedits", label: "GigaEdits" },
  { href: "/gigaedit", label: "GigaEdit editor" },
  { href: "/media", label: "Media Studio" },
  { href: "/gigalearn", label: "GigaLearn" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/creator-studio", label: "Creator Studio" },
  { href: "/video", label: "Video AI" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/discover", label: "Discover" },
  { href: "/pricing", label: "Pricing" },
] as const;

/** Footer product column — crawlable internal links across the public ecosystem. */
export const FOOTER_PRODUCT_LINKS = [
  { href: "/", label: "Giga3 AI" },
  { href: "/chat", label: "AI Chat" },
  { href: "/gigasocial", label: "GigaSocial" },
  { href: "/gigaedits", label: "GigaEdits" },
  { href: "/gigaedit", label: "GigaEdit" },
  { href: "/media", label: "Media Studio" },
  { href: "/video", label: "Video AI" },
  { href: "/gigalearn", label: "GigaLearn" },
  { href: "/creator-studio", label: "Creator Studio" },
  { href: "/discover", label: "Discover" },
  { href: "/trending", label: "Trending topics" },
  { href: "/prompts", label: "Prompt library" },
  { href: "/ai-studio", label: "Giga3 AI Studio" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/enterprise", label: "Enterprise & Education" },
  { href: "/developers", label: "Developer API" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

export const CREATOR_WORKFLOW_STEPS = [
  {
    step: "Create",
    href: "/media",
    description: "Generate images and visual assets in Media Studio.",
  },
  {
    step: "Edit",
    href: "/gigaedit",
    description: "Trim, join, caption, and polish video in GigaEdit.",
  },
  {
    step: "Publish",
    href: "/gigasocial",
    description: "Share finished work to GigaSocial and your audience.",
  },
] as const;
