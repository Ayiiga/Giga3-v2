import { siteConfig } from "@/lib/site";
import type { IntegrationAdapter } from "./types";

/** Adapter registry — Giga3 modules active; external services future-ready. */
export const INTEGRATION_ADAPTERS: IntegrationAdapter[] = [
  {
    id: "giga3_chat",
    label: "Giga3 Chat",
    category: "Platform",
    available: true,
    description: "AI conversations and workflow chat steps.",
    href: siteConfig.links.dashboard,
  },
  {
    id: "giga3_media",
    label: "Media Studio",
    category: "Platform",
    available: true,
    description: "Image and video generation pipelines.",
    href: siteConfig.links.media,
  },
  {
    id: "giga3_gigalearn",
    label: "GigaLearn",
    category: "Platform",
    available: true,
    description: "Education tools for workflow automation steps.",
    href: siteConfig.links.gigalearn,
  },
  {
    id: "giga3_marketplace",
    label: "Marketplace",
    category: "Platform",
    available: true,
    description: "Digital products and templates.",
    href: siteConfig.links.marketplace,
  },
  {
    id: "google_drive",
    label: "Google Drive",
    category: "Cloud storage",
    available: false,
    description: "Import/export documents (planned adapter).",
  },
  {
    id: "outlook_calendar",
    label: "Outlook Calendar",
    category: "Calendar",
    available: false,
    description: "Schedule study sessions and deadlines (planned).",
  },
  {
    id: "gmail",
    label: "Gmail",
    category: "Email",
    available: false,
    description: "Email digests and reminders (planned).",
  },
  {
    id: "zoom",
    label: "Zoom",
    category: "Video conferencing",
    available: false,
    description: "Class session links (planned).",
  },
  {
    id: "moodle",
    label: "Moodle LMS",
    category: "Learning Management",
    available: false,
    description: "Sync assignments and courses (planned).",
  },
  {
    id: "notion",
    label: "Notion",
    category: "Productivity",
    available: false,
    description: "Export notes and knowledge bases (planned).",
  },
];

export function getActiveIntegrations(): IntegrationAdapter[] {
  return INTEGRATION_ADAPTERS.filter((a) => a.available);
}

export function getIntegration(id: string): IntegrationAdapter | undefined {
  return INTEGRATION_ADAPTERS.find((a) => a.id === id);
}
