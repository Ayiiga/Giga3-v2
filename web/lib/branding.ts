/** Shared PWA / install branding tokens (keep in sync with manifest + generate-branding.mjs). */
export const branding = {
  name: "Giga3 AI",
  shortName: "Giga3",
  description:
    "Intelligent conversations at scale — modern AI chat, writing, and media with credits & subscriptions.",
  themeColor: "#5b21b6",
  backgroundColor: "#ffffff",
  accentLight: "#f5f3ff",
  id: "/",
  startUrl: "/",
  scope: "/",
  display: "standalone" as const,
  orientation: "portrait-primary" as const,
  categories: ["productivity", "utilities"] as const,
} as const;
