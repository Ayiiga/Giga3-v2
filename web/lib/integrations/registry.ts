/**
 * Minimal integration foundation for third-party connected apps.
 * OAuth tokens and secrets must stay server-side — this registry is UI metadata only.
 */

export type IntegrationProviderId =
  | "google-drive"
  | "dropbox"
  | "github"
  | "notion"
  | "slack"
  | "trello"
  | "canva"
  | "figma"
  | "google-calendar"
  | "gmail"
  | "microsoft";

export type IntegrationConnectionState =
  | "not_connected"
  | "connected"
  | "error"
  | "revoked";

export type IntegrationDescriptor = {
  id: IntegrationProviderId;
  name: string;
  description: string;
  scopesSummary: string;
  /** Reserved for future OAuth start URL — never embed secrets here. */
  connectPath?: string;
  docsUrl?: string;
};

export const INTEGRATION_CATALOG: IntegrationDescriptor[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Import and export files from Drive.",
    scopesSummary: "Read and write files you choose",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Attach files from your Dropbox folders.",
    scopesSummary: "Read files you select",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Reference repos, issues, and pull requests in chat.",
    scopesSummary: "Read repositories you authorize",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Pull pages and databases into Giga3 workflows.",
    scopesSummary: "Read pages you connect",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Share Giga3 outputs to Slack channels.",
    scopesSummary: "Post messages to channels you pick",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Schedule reminders and content publishing.",
    scopesSummary: "Manage events you authorize",
  },
];

export function listIntegrations(): IntegrationDescriptor[] {
  return INTEGRATION_CATALOG;
}

export function getIntegration(id: IntegrationProviderId): IntegrationDescriptor | undefined {
  return INTEGRATION_CATALOG.find((item) => item.id === id);
}
