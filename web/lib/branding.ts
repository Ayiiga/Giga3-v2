/** Shared PWA / install branding tokens (keep in sync with manifest + generate-branding.mjs). */
export const branding = {
  name: "Giga3 Hub",
  shortName: "Giga3 Hub",
  description:
    "Giga3 Hub brings AI assistance, social networking, learning, creativity, publishing, marketplace and digital services together in one connected platform. Giga3 AI remains the dedicated AI assistant service.",
  themeColor: "#7C3AED",
  backgroundColor: "#0A0A0F",
  accentLight: "#f5f3ff",
  id: "/",
  startUrl: "/",
  scope: "/",
  display: "standalone" as const,
  orientation: "portrait-primary" as const,
  categories: ["productivity", "utilities"] as const,
} as const;
