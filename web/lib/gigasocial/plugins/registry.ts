/**
 * Lightweight plugin registry — future tools install without rebuilding the app shell.
 * Plugins are descriptors only until a backend enables them.
 */

export type SocialPluginCategory =
  | "ai"
  | "education"
  | "business"
  | "creator"
  | "games"
  | "productivity";

export type SocialPlugin = {
  id: string;
  name: string;
  description: string;
  category: SocialPluginCategory;
  version: string;
  enabled: boolean;
  /** Optional deep link when a tool already exists in the PWA. */
  href?: string;
};

export const SOCIAL_PLUGIN_CATALOG: SocialPlugin[] = [
  {
    id: "ai-models-hub",
    name: "Future AI Models",
    description: "Swap social AI providers without UI changes.",
    category: "ai",
    version: "0.1.0",
    enabled: false,
  },
  {
    id: "education-tools",
    name: "Education Tools",
    description: "Lesson planners and quiz packs for teachers.",
    category: "education",
    version: "0.1.0",
    enabled: true,
    href: "/gigalearn",
  },
  {
    id: "business-tools",
    name: "Business Tools",
    description: "SME kits for invoices, catalogs, and outreach.",
    category: "business",
    version: "0.1.0",
    enabled: false,
  },
  {
    id: "creator-tools",
    name: "Creator Tools",
    description: "Templates and brand kits for creators.",
    category: "creator",
    version: "0.1.0",
    enabled: true,
    href: "/creator-studio",
  },
  {
    id: "mini-games",
    name: "Games",
    description: "Lightweight community games and challenges.",
    category: "games",
    version: "0.1.0",
    enabled: false,
  },
  {
    id: "productivity",
    name: "Productivity Tools",
    description: "Task boards and community calendars.",
    category: "productivity",
    version: "0.1.0",
    enabled: false,
  },
];

export function listSocialPlugins(options?: { onlyEnabled?: boolean }): SocialPlugin[] {
  if (options?.onlyEnabled) {
    return SOCIAL_PLUGIN_CATALOG.filter((plugin) => plugin.enabled);
  }
  return SOCIAL_PLUGIN_CATALOG;
}

export function getSocialPlugin(id: string): SocialPlugin | undefined {
  return SOCIAL_PLUGIN_CATALOG.find((plugin) => plugin.id === id);
}

/** Module boundaries for future-ready maintenance. */
export const GIGASOCIAL_MODULES = [
  "ai",
  "social-feed",
  "communities",
  "marketplace",
  "wallet",
  "messaging",
  "creator-studio",
  "analytics",
  "notifications",
  "settings",
  "live-streaming",
] as const;

export type GigaSocialModuleId = (typeof GIGASOCIAL_MODULES)[number];
