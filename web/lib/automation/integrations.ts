import { siteConfig } from "@/lib/site";
import type { IntegrationAdapter, IntegrationId, IntegrationStatus } from "./types";

/**
 * Static registry for platform links + external connector metadata.
 * Live status for external providers comes from Convex `connectors/status`
 * (credentials + user connection). Never mark external providers Active
 * from this file alone.
 */
export const INTEGRATION_ADAPTERS: IntegrationAdapter[] = [
  {
    id: "giga3_chat",
    label: "Giga3 Chat",
    category: "Platform",
    available: true,
    status: "active",
    description: "AI conversations and workflow chat steps.",
    href: siteConfig.links.dashboard,
  },
  {
    id: "giga3_gigalearn",
    label: "GigaLearn",
    category: "Platform",
    available: true,
    status: "active",
    description: "Education tools for workflow automation steps.",
    href: siteConfig.links.gigalearn,
  },
  {
    id: "giga3_academy",
    label: "GigaLearn Academy",
    category: "Platform",
    available: true,
    status: "active",
    description: "Courses, tutoring, and Technology Learning Hub.",
    href: siteConfig.links.gigalearnAcademy,
  },
  {
    id: "giga3_marketplace",
    label: "Marketplace",
    category: "Platform",
    available: true,
    status: "active",
    description: "Digital products and templates.",
    href: siteConfig.links.marketplace,
  },
  {
    id: "google_drive",
    label: "Google Drive",
    category: "Cloud storage",
    available: false,
    status: "needs_configuration",
    description: "List, search, import, and export documents you select.",
    external: true,
  },
  {
    id: "gmail",
    label: "Gmail",
    category: "Email",
    available: false,
    status: "needs_configuration",
    description: "Read, search, draft, and send mail only after you confirm.",
    external: true,
  },
  {
    id: "outlook_calendar",
    label: "Outlook Calendar",
    category: "Calendar",
    available: false,
    status: "needs_configuration",
    description: "Read events and create or update them after confirmation.",
    external: true,
  },
  {
    id: "zoom",
    label: "Zoom",
    category: "Video conferencing",
    available: false,
    status: "needs_configuration",
    description: "Create meeting links and list authorised meetings.",
    external: true,
  },
  {
    id: "moodle",
    label: "Moodle LMS",
    category: "Learning Management",
    available: false,
    status: "available",
    description: "Connect your Moodle site with a personal web-service token.",
    external: true,
  },
  {
    id: "notion",
    label: "Notion",
    category: "Productivity",
    available: false,
    status: "needs_configuration",
    description: "Search, read, create pages, and append content in your workspace.",
    external: true,
  },
];

export function getActiveIntegrations(): IntegrationAdapter[] {
  return INTEGRATION_ADAPTERS.filter(
    (a) => a.status === "active" || a.status === "connected" || a.available
  );
}

export function getIntegration(id: string): IntegrationAdapter | undefined {
  return INTEGRATION_ADAPTERS.find((a) => a.id === id);
}

export function isExternalIntegrationId(id: IntegrationId): boolean {
  return Boolean(getIntegration(id)?.external);
}

export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  active: "Active",
  available: "Available to connect",
  connected: "Connected",
  needs_configuration: "Needs configuration",
  needs_reauth: "Needs reauthorisation",
  temporarily_unavailable: "Temporarily unavailable",
  planned: "Planned",
};
