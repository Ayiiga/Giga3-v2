/** Shared PWA / install branding tokens (keep in sync with manifest + generate-branding.mjs). */
export const branding = {
  name: "Giga3 AI",
  shortName: "Giga3 AI",
  description:
    "Giga3 AI is a Ghana-built platform for BECE and WASSCE study support, teacher learning, AI chat, content creation, GigaSocial and marketplace tools.",
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
