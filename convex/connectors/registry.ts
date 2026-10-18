import type {
  ConnectorId,
  ConnectorProviderConfig,
  ExternalConnectorId,
  PlatformConnectorConfig,
} from "./types";

/** Platform modules already live in Giga3 — not external OAuth. */
export const PLATFORM_CONNECTORS: PlatformConnectorConfig[] = [
  {
    id: "giga3_chat",
    label: "Giga3 Chat",
    category: "Platform",
    description: "AI conversations and workflow chat steps.",
    href: "/chat/",
    capabilities: ["read", "write"],
  },
  {
    id: "giga3_media",
    label: "Media Studio",
    category: "Platform",
    description: "Image and video generation pipelines.",
    href: "/media/",
    capabilities: ["read", "write"],
  },
  {
    id: "giga3_gigalearn",
    label: "GigaLearn",
    category: "Platform",
    description: "Education tools for workflow automation steps.",
    href: "/gigalearn/",
    capabilities: ["read", "write", "lms"],
  },
  {
    id: "giga3_marketplace",
    label: "Marketplace",
    category: "Platform",
    description: "Digital products and templates.",
    href: "/marketplace/",
    capabilities: ["read", "write"],
  },
];

/**
 * External providers with real adapter implementations.
 * Status becomes "available" only when required Convex env secrets are set.
 */
export const EXTERNAL_CONNECTORS: ConnectorProviderConfig[] = [
  {
    id: "google_drive",
    label: "Google Drive",
    category: "Cloud storage",
    description: "List, search, import, and export documents you select.",
    authKind: "oauth2",
    scopes: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
    ],
    capabilities: ["oauth", "list", "search", "read", "import", "export", "disconnect"],
    requiredEnvKeys: ["GOOGLE_CONNECTOR_CLIENT_ID", "GOOGLE_CONNECTOR_CLIENT_SECRET"],
    setupNotes:
      "Google Cloud OAuth web client with redirect URI https://<deployment>.convex.site/connectors/oauth/callback. Enable Google Drive API.",
    mayNeedProviderApproval: true,
  },
  {
    id: "gmail",
    label: "Gmail",
    category: "Email",
    description: "Read, search, draft, and send mail only after you confirm.",
    authKind: "oauth2",
    scopes: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    capabilities: [
      "oauth",
      "list",
      "search",
      "read",
      "draft_email",
      "send_email",
      "disconnect",
    ],
    requiredEnvKeys: ["GOOGLE_CONNECTOR_CLIENT_ID", "GOOGLE_CONNECTOR_CLIENT_SECRET"],
    setupNotes:
      "Same Google OAuth client as Drive. Gmail send/compose scopes are restricted — Google verification may be required for production users beyond test users.",
    mayNeedProviderApproval: true,
  },
  {
    id: "outlook_calendar",
    label: "Outlook Calendar",
    category: "Calendar",
    description: "Read events and create or update them after confirmation.",
    authKind: "oauth2",
    scopes: [
      "openid",
      "email",
      "offline_access",
      "Calendars.Read",
      "Calendars.ReadWrite",
    ],
    capabilities: [
      "oauth",
      "list",
      "search",
      "calendar_read",
      "calendar_write",
      "disconnect",
    ],
    requiredEnvKeys: [
      "MICROSOFT_CONNECTOR_CLIENT_ID",
      "MICROSOFT_CONNECTOR_CLIENT_SECRET",
    ],
    setupNotes:
      "Microsoft Entra app registration (web) with redirect URI on Convex site /connectors/oauth/callback. Tenant defaults to common.",
  },
  {
    id: "zoom",
    label: "Zoom",
    category: "Video conferencing",
    description: "Create meeting links and list authorised meetings.",
    authKind: "oauth2",
    scopes: ["meeting:write:meeting", "meeting:read:list_meetings", "user:read:user"],
    capabilities: ["oauth", "list", "meetings", "disconnect"],
    requiredEnvKeys: ["ZOOM_CONNECTOR_CLIENT_ID", "ZOOM_CONNECTOR_CLIENT_SECRET"],
    setupNotes:
      "Zoom Marketplace OAuth app (User-managed). Redirect URL must match Convex /connectors/oauth/callback.",
  },
  {
    id: "moodle",
    label: "Moodle LMS",
    category: "Learning Management",
    description: "Connect your Moodle site with a personal web-service token.",
    authKind: "api_token",
    scopes: ["core_course_get_courses", "mod_assign_get_assignments"],
    capabilities: ["list", "read", "lms", "disconnect"],
    requiredEnvKeys: [],
    setupNotes:
      "Users supply their Moodle site URL and a personal web-service token (not admin credentials). Capabilities vary by site configuration.",
  },
  {
    id: "notion",
    label: "Notion",
    category: "Productivity",
    description: "Search, read, create pages, and append content in your workspace.",
    authKind: "oauth2",
    scopes: [],
    capabilities: ["oauth", "list", "search", "read", "write", "disconnect"],
    requiredEnvKeys: ["NOTION_CONNECTOR_CLIENT_ID", "NOTION_CONNECTOR_CLIENT_SECRET"],
    setupNotes:
      "Notion public integration with redirect URI on Convex /connectors/oauth/callback.",
  },
];

export function getExternalConnector(
  id: string
): ConnectorProviderConfig | undefined {
  return EXTERNAL_CONNECTORS.find((c) => c.id === id);
}

export function isExternalConnectorId(id: string): id is ExternalConnectorId {
  return EXTERNAL_CONNECTORS.some((c) => c.id === id);
}

export function isPlatformConnectorId(id: string): boolean {
  return PLATFORM_CONNECTORS.some((c) => c.id === id);
}

export function listAllConnectorIds(): ConnectorId[] {
  return [
    ...PLATFORM_CONNECTORS.map((c) => c.id),
    ...EXTERNAL_CONNECTORS.map((c) => c.id),
  ];
}

/** Missing required Convex env keys for a provider (empty = configured). */
export function missingEnvKeysForProvider(
  provider: ConnectorProviderConfig,
  env: NodeJS.ProcessEnv = process.env
): string[] {
  return provider.requiredEnvKeys.filter((key) => !env[key]?.trim());
}

export function isProviderConfigured(
  provider: ConnectorProviderConfig,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (provider.authKind === "api_token") {
    // Moodle is per-user; platform config is always ready for connect form.
    return true;
  }
  return missingEnvKeysForProvider(provider, env).length === 0;
}

export function convexSiteBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const site =
    env.CONVEX_SITE_URL?.replace(/\/$/, "") ||
    env.NEXT_PUBLIC_CONVEX_SITE_URL?.replace(/\/$/, "");
  if (site) return site;
  // Derive from CONVEX_URL when possible (*.convex.cloud → *.convex.site).
  const cloud = env.CONVEX_URL?.replace(/\/$/, "") || "";
  if (cloud.includes(".convex.cloud")) {
    return cloud.replace(".convex.cloud", ".convex.site");
  }
  return "";
}

export function frontendBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.FRONTEND_URL?.replace(/\/$/, "") || "https://www.giga3ai.com"
  );
}

export function oauthCallbackUrl(env: NodeJS.ProcessEnv = process.env): string {
  const base = convexSiteBaseUrl(env);
  return base ? `${base}/connectors/oauth/callback` : "";
}
