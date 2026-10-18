import { describe, expect, it } from "vitest";
import {
  evaluatePendingClaim,
  lockedPayloadFromClaim,
  type PendingActionRow,
} from "../../convex/connectors/pendingActionPolicy";
import {
  gateConnectorTool,
  isAllowedConnectorOperation,
  toolRequiresConfirmation,
} from "../../convex/connectors/toolPolicy";

function pending(overrides?: Partial<PendingActionRow>): PendingActionRow {
  return {
    userId: "user-a",
    provider: "gmail",
    actionType: "send_email",
    payloadJson: JSON.stringify({
      to: "teacher@school.edu",
      subject: "Hello",
      body: "Body",
    }),
    summary: "Send email to teacher@school.edu",
    status: "pending",
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

describe("connector confirmation binding", () => {
  it("binds confirmation to the authenticated user", () => {
    const decision = evaluatePendingClaim(pending(), {
      userId: "user-b",
      provider: "gmail",
      actionType: "send_email",
    });
    expect(decision.ok).toBe(false);
  });

  it("requires provider and action type to match the staged row", () => {
    expect(
      evaluatePendingClaim(pending(), {
        userId: "user-a",
        provider: "zoom",
        actionType: "send_email",
      }).ok
    ).toBe(false);
    expect(
      evaluatePendingClaim(pending(), {
        userId: "user-a",
        provider: "gmail",
        actionType: "create_meeting",
      }).ok
    ).toBe(false);
  });

  it("returns immutable staged payload for execution", () => {
    const staged = pending({
      payloadJson: JSON.stringify({ to: "a@b.com", subject: "locked", body: "x" }),
    });
    const decision = evaluatePendingClaim(staged, {
      userId: "user-a",
      provider: "gmail",
      actionType: "send_email",
    });
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    const locked = lockedPayloadFromClaim(decision);
    expect(locked).toEqual({ to: "a@b.com", subject: "locked", body: "x" });
    // Mutating the returned object must not change the claim's payloadJson string.
    locked.subject = "tampered";
    expect(JSON.parse(decision.payloadJson).subject).toBe("locked");
  });

  it("rejects expired, cancelled, failed, and in-progress actions", () => {
    expect(
      evaluatePendingClaim(pending({ expiresAt: Date.now() - 1 }), {
        userId: "user-a",
        provider: "gmail",
        actionType: "send_email",
      })
    ).toMatchObject({ ok: false, markCancelled: true });

    expect(
      evaluatePendingClaim(pending({ status: "cancelled" }), {
        userId: "user-a",
        provider: "gmail",
        actionType: "send_email",
      }).ok
    ).toBe(false);

    expect(
      evaluatePendingClaim(pending({ status: "failed" }), {
        userId: "user-a",
        provider: "gmail",
        actionType: "send_email",
      }).ok
    ).toBe(false);

    expect(
      evaluatePendingClaim(pending({ status: "confirmed" }), {
        userId: "user-a",
        provider: "gmail",
        actionType: "send_email",
      }).ok
    ).toBe(false);
  });

  it("duplicate confirm after execute returns alreadyExecuted without re-authorizing write", () => {
    const decision = evaluatePendingClaim(
      pending({
        status: "executed",
        resultJson: JSON.stringify({ sent: true }),
      }),
      {
        userId: "user-a",
        provider: "gmail",
        actionType: "send_email",
      }
    );
    expect(decision).toMatchObject({
      ok: false,
      alreadyExecuted: true,
      resultJson: JSON.stringify({ sent: true }),
    });
  });

  it("rejects unsupported provider operations server-side", () => {
    expect(isAllowedConnectorOperation("gmail", "send_email")).toBe(true);
    expect(isAllowedConnectorOperation("gmail", "wipe_inbox")).toBe(false);
    expect(isAllowedConnectorOperation("notion", "append_page")).toBe(true);
    expect(isAllowedConnectorOperation("moodle", "drop_tables")).toBe(false);
  });

  it("requires confirmation for email, calendar, zoom, and external writes", () => {
    for (const tool of [
      "send_email",
      "create_event",
      "update_event",
      "cancel_event",
      "create_meeting",
      "export_file",
      "create_page",
      "append_page",
    ] as const) {
      expect(toolRequiresConfirmation(tool)).toBe(true);
      expect(
        gateConnectorTool({
          tool,
          connected: true,
          confirmed: true,
        }).ok
      ).toBe(false);
      expect(
        gateConnectorTool({
          tool,
          connected: true,
          confirmed: true,
          pendingActionId: "p1",
        }).ok
      ).toBe(true);
    }
  });

  it("missing connector authorization prevents execution", () => {
    expect(
      gateConnectorTool({ tool: "send_email", connected: false }).ok
    ).toBe(false);
    expect(
      gateConnectorTool({ tool: "list_messages", connected: false }).ok
    ).toBe(false);
  });
});
