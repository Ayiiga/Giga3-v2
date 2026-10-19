import { describe, expect, it } from "vitest";
import {
  gateConnectorTool,
  isAllowedConnectorOperation,
  isCrossUserForbidden,
  sanitizeUntrustedExternalText,
  toolRequiresConfirmation,
} from "../../convex/connectors/toolPolicy";

describe("connector tool policy", () => {
  it("requires confirmation before sending mail or mutating calendar/meetings", () => {
    expect(toolRequiresConfirmation("send_email")).toBe(true);
    expect(toolRequiresConfirmation("create_event")).toBe(true);
    expect(toolRequiresConfirmation("cancel_event")).toBe(true);
    expect(toolRequiresConfirmation("create_meeting")).toBe(true);
    expect(toolRequiresConfirmation("draft_reply")).toBe(false);
    expect(toolRequiresConfirmation("list_files")).toBe(false);
  });

  it("blocks tools when disconnected", () => {
    expect(
      gateConnectorTool({ tool: "list_files", connected: false })
    ).toEqual({ ok: false, error: "Connect this integration before using it." });
  });

  it("requires pendingActionId when confirming consequential tools", () => {
    expect(
      gateConnectorTool({
        tool: "send_email",
        connected: true,
        confirmed: true,
      }).ok
    ).toBe(false);
    expect(
      gateConnectorTool({
        tool: "send_email",
        connected: true,
        confirmed: true,
        pendingActionId: "pending123",
      })
    ).toEqual({ ok: true, requiresConfirmation: true });
  });

  it("enforces cross-user isolation", () => {
    expect(isCrossUserForbidden("a@x.com", "b@x.com")).toBe(true);
    expect(isCrossUserForbidden("A@x.com", "a@x.com")).toBe(false);
  });

  it("strips nulls and truncates untrusted external text", () => {
    expect(sanitizeUntrustedExternalText("hi\u0000there", 4)).toBe("hith");
  });

  it("allowlists only known provider operations", () => {
    expect(isAllowedConnectorOperation("gmail", "send_email")).toBe(true);
    expect(isAllowedConnectorOperation("gmail", "delete_all")).toBe(false);
    expect(isAllowedConnectorOperation("zoom", "create_meeting")).toBe(true);
    expect(isAllowedConnectorOperation("unknown", "list_files")).toBe(false);
  });
});
