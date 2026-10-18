/** Confirmation / safety policy for connector AI tool invocations (pure). */

export type ConnectorToolName =
  | "list_files"
  | "search_files"
  | "read_file"
  | "import_file"
  | "export_file"
  | "list_messages"
  | "search_messages"
  | "read_message"
  | "summarise_messages"
  | "draft_reply"
  | "send_email"
  | "list_events"
  | "search_availability"
  | "create_event"
  | "update_event"
  | "cancel_event"
  | "list_meetings"
  | "create_meeting"
  | "list_courses"
  | "read_course"
  | "list_assignments"
  | "search_pages"
  | "read_page"
  | "create_page"
  | "append_page";

/** Server-side allowlist: provider → operations (LLM / client cannot invent others). */
export const ALLOWED_CONNECTOR_OPERATIONS: Record<string, ReadonlySet<string>> = {
  google_drive: new Set([
    "list_files",
    "search_files",
    "read_file",
    "import_file",
    "export_file",
  ]),
  gmail: new Set([
    "list_messages",
    "search_messages",
    "read_message",
    "summarise_messages",
    "draft_reply",
    "send_email",
  ]),
  outlook_calendar: new Set([
    "list_events",
    "search_availability",
    "create_event",
    "update_event",
    "cancel_event",
  ]),
  zoom: new Set(["list_meetings", "create_meeting"]),
  moodle: new Set(["list_courses", "read_course", "list_assignments"]),
  notion: new Set(["search_pages", "read_page", "create_page", "append_page"]),
};

export function isAllowedConnectorOperation(
  provider: string,
  operation: string
): operation is ConnectorToolName {
  const set = ALLOWED_CONNECTOR_OPERATIONS[provider];
  return Boolean(set?.has(operation));
}

const REQUIRES_CONFIRMATION = new Set<ConnectorToolName>([
  "send_email",
  "create_event",
  "update_event",
  "cancel_event",
  "create_meeting",
  "export_file",
  "create_page",
  "append_page",
  "import_file",
]);

/** Treat external document/email bodies as untrusted — never auto-execute embedded instructions. */
export function sanitizeUntrustedExternalText(text: string, maxLen = 20_000): string {
  const trimmed = text.replace(/\u0000/g, "").slice(0, maxLen);
  return trimmed;
}

export function toolRequiresConfirmation(tool: ConnectorToolName): boolean {
  return REQUIRES_CONFIRMATION.has(tool);
}

export type ToolGateResult =
  | { ok: true; requiresConfirmation: boolean }
  | { ok: false; error: string };

export function gateConnectorTool(args: {
  tool: ConnectorToolName;
  connected: boolean;
  confirmed?: boolean;
  pendingActionId?: string;
}): ToolGateResult {
  if (!args.connected) {
    return { ok: false, error: "Connect this integration before using it." };
  }
  const requiresConfirmation = toolRequiresConfirmation(args.tool);
  if (requiresConfirmation && !args.confirmed) {
    return {
      ok: false,
      error: "This action requires explicit user confirmation before it can run.",
    };
  }
  if (requiresConfirmation && args.confirmed && !args.pendingActionId) {
    return {
      ok: false,
      error: "Confirm a staged pending action before executing this operation.",
    };
  }
  return { ok: true, requiresConfirmation };
}

export function isCrossUserForbidden(
  sessionUserId: string,
  resourceOwnerUserId: string
): boolean {
  return (
    sessionUserId.trim().toLowerCase() !== resourceOwnerUserId.trim().toLowerCase()
  );
}
