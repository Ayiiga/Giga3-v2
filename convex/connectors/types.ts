/** Shared connector types (pure — safe for unit tests). */

export type PlatformConnectorId =
  | "giga3_chat"
  | "giga3_media"
  | "giga3_gigalearn"
  | "giga3_marketplace";

export type ExternalConnectorId =
  | "google_drive"
  | "gmail"
  | "outlook_calendar"
  | "zoom"
  | "moodle"
  | "notion";

export type ConnectorId = PlatformConnectorId | ExternalConnectorId;

/**
 * UI / API status for a connector card.
 * Never mark "connected" or "active" without a real backend connection
 * (platform links use "active"; external providers use the rest).
 */
export type ConnectorStatus =
  | "active"
  | "available"
  | "connected"
  | "needs_configuration"
  | "needs_reauth"
  | "temporarily_unavailable"
  | "planned";

export type ConnectorCapability =
  | "oauth"
  | "list"
  | "search"
  | "read"
  | "write"
  | "import"
  | "export"
  | "send_email"
  | "draft_email"
  | "calendar_read"
  | "calendar_write"
  | "meetings"
  | "lms"
  | "disconnect";

export type ConnectorProviderConfig = {
  id: ExternalConnectorId;
  label: string;
  category: string;
  description: string;
  authKind: "oauth2" | "api_token";
  /** OAuth scopes / API permissions requested. */
  scopes: string[];
  capabilities: ConnectorCapability[];
  /** Convex env keys required before users can connect. */
  requiredEnvKeys: string[];
  /** Optional docs / setup notes shown in UI. */
  setupNotes: string;
  /** Google restricted scopes may need verification. */
  mayNeedProviderApproval?: boolean;
};

export type PlatformConnectorConfig = {
  id: PlatformConnectorId;
  label: string;
  category: string;
  description: string;
  href: string;
  capabilities: ConnectorCapability[];
};

export type ConnectorCardView = {
  id: ConnectorId;
  label: string;
  category: string;
  description: string;
  status: ConnectorStatus;
  statusLabel: string;
  href?: string;
  capabilities: ConnectorCapability[];
  setupNotes?: string;
  accountLabel?: string | null;
  connectedAt?: number | null;
  missingEnvKeys?: string[];
  mayNeedProviderApproval?: boolean;
  canConnect: boolean;
  canDisconnect: boolean;
  canReconnect: boolean;
};

export type ConnectorTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes: string[];
  accountLabel?: string;
  metadata?: Record<string, unknown>;
};

export const CONNECTOR_STATUS_LABELS: Record<ConnectorStatus, string> = {
  active: "Active",
  available: "Available to connect",
  connected: "Connected",
  needs_configuration: "Needs configuration",
  needs_reauth: "Needs reauthorisation",
  temporarily_unavailable: "Temporarily unavailable",
  planned: "Planned",
};
