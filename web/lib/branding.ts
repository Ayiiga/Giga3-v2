/** Shared PWA / install branding tokens (keep in sync with manifest + generate-branding.mjs). */
export const branding = {
  name: "Giga3 AI",
  shortName: "Giga3 AI",
  description:
    "Giga3 AI is Africa's AI Super App for social, AI tools, learning, creativity, marketplace and digital services.",
  themeColor: "#5b21b6",
  backgroundColor: "#5b21b6",
  accentLight: "#f5f3ff",
  id: "/",
  startUrl: "/",
  scope: "/",
  display: "standalone" as const,
  orientation: "portrait-primary" as const,
  categories: ["productivity", "utilities"] as const,
} as const;
