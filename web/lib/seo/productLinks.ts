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
  { href: "/discover", label: "Discover" },
  { href: "/pricing", label: "Pricing" },
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
