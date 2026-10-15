import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertDmThreadParticipant,
  assertGigaSocialDmEnabled,
  clampDmMessageLimit,
  clampDmThreadLimit,
  dmPreviewFromBody,
  isDmThreadParticipant,
  isGigaSocialDmEnabled,
  normalizeDmParticipantPair,
  sanitizeDmBody,
  sanitizeDmReportReason,
} from "../../convex/gigaSocialDmPolicy";
import { ForbiddenError, ValidationError } from "../../convex/securityErrors";
import { socialWriteLimitForAction } from "../../convex/socialRateLimit";

const schemaSrc = readFileSync(resolve(__dirname, "../../convex/schema.ts"), "utf8");
const dmSrc = readFileSync(resolve(__dirname, "../../convex/gigaSocialDm.ts"), "utf8");
const gigaSocialSrc = readFileSync(
  resolve(__dirname, "../../convex/gigaSocial.ts"),
  "utf8"
);

describe("GigaSocial DM feature flag (default off)", () => {
  it("is disabled when env unset", () => {
    expect(isGigaSocialDmEnabled({})).toBe(false);
    expect(() => assertGigaSocialDmEnabled({})).toThrow(ForbiddenError);
  });

  it("respects GIGASOCIAL_DM_ENABLED and NEXT_PUBLIC fallback", () => {
    expect(isGigaSocialDmEnabled({ GIGASOCIAL_DM_ENABLED: "true" })).toBe(true);
    expect(isGigaSocialDmEnabled({ GIGASOCIAL_DM_ENABLED: "false" })).toBe(false);
    expect(
      isGigaSocialDmEnabled({
        GIGASOCIAL_DM_ENABLED: "false",
        NEXT_PUBLIC_GIGASOCIAL_DM: "true",
      })
    ).toBe(false);
    expect(isGigaSocialDmEnabled({ NEXT_PUBLIC_GIGASOCIAL_DM: "true" })).toBe(true);
  });

  it("every exported DM handler asserts the flag before work", () => {
    for (const name of [
      "listMyThreads",
      "listThreadMessages",
      "sendMessage",
      "acceptRequest",
      "blockUser",
      "reportMessage",
    ]) {
      const block =
        dmSrc.match(
          new RegExp(`export const ${name} = (?:query|mutation)\\([\\s\\S]*?\\n\\}\\);`)
        )?.[0] ?? "";
      expect(block, name).toContain("assertGigaSocialDmEnabled()");
      expect(block, name).toMatch(/requireDmUserId|requireSession/);
    }
  });
});

describe("GigaSocial DM participant policy", () => {
  it("normalizes pair order and rejects self/empty", () => {
    expect(normalizeDmParticipantPair("B@x.com", "a@x.com")).toEqual({
      participantAId: "a@x.com",
      participantBId: "b@x.com",
    });
    expect(() => normalizeDmParticipantPair("a@x.com", "a@x.com")).toThrow(
      ValidationError
    );
    expect(() => normalizeDmParticipantPair("", "a@x.com")).toThrow(ValidationError);
  });

  it("enforces participant ownership", () => {
    const thread = { participantAId: "a@x.com", participantBId: "b@x.com" };
    expect(isDmThreadParticipant(thread, "A@x.com")).toBe(true);
    expect(isDmThreadParticipant(thread, "c@x.com")).toBe(false);
    expect(() => assertDmThreadParticipant(thread, "c@x.com")).toThrow(ForbiddenError);
  });

  it("validates body, preview, limits, and report reason", () => {
    expect(sanitizeDmBody("  hello  ")).toBe("hello");
    expect(() => sanitizeDmBody("   ")).toThrow(ValidationError);
    expect(() => sanitizeDmBody("x".repeat(2001))).toThrow(ValidationError);
    expect(dmPreviewFromBody("a".repeat(200)).length).toBeLessThanOrEqual(140);
    expect(clampDmThreadLimit(999)).toBe(40);
    expect(clampDmMessageLimit(0)).toBe(1);
    expect(sanitizeDmReportReason("spam")).toBe("spam");
    expect(() => sanitizeDmReportReason("  ")).toThrow(ValidationError);
  });
});

describe("GigaSocial DM schema indexes", () => {
  it("defines all socialDm tables and required indexes", () => {
    expect(schemaSrc).toContain("socialDmThreads: defineTable");
    expect(schemaSrc).toContain("socialDmMessages: defineTable");
    expect(schemaSrc).toContain("socialDmReads: defineTable");
    expect(schemaSrc).toContain("socialDmBlocks: defineTable");
    expect(schemaSrc).toContain("socialDmReports: defineTable");
    expect(schemaSrc).toContain('.index("by_pair", ["participantAId", "participantBId"])');
    expect(schemaSrc).toContain('.index("by_participantA_updated"');
    expect(schemaSrc).toContain('.index("by_participantB_updated"');
    expect(schemaSrc).toContain('.index("by_thread_created"');
    expect(schemaSrc).toContain('.index("by_thread_user"');
    expect(schemaSrc).toContain('.index("by_blocker"');
    expect(schemaSrc).toContain('.index("by_reporter_created"');
  });

  it("does not alter socialNotifications APIs", () => {
    expect(gigaSocialSrc).toContain("export const listNotifications = query");
    expect(gigaSocialSrc).toContain("export const getNotificationUnreadCount = query");
    expect(gigaSocialSrc).toContain("export const markNotificationsRead = mutation");
    expect(schemaSrc).toContain("socialNotifications: defineTable");
  });
});

describe("GigaSocial DM authz wiring in handlers", () => {
  it("listThreadMessages checks participation before returning bodies", () => {
    const block =
      dmSrc.match(/export const listThreadMessages = query\([\s\S]*?\n\}\);/)?.[0] ??
      "";
    expect(block).toContain("assertDmThreadParticipant");
    expect(block).toContain("assertGigaSocialDmEnabled");
  });

  it("acceptRequest forbids initiator accepting own request", () => {
    const block =
      dmSrc.match(/export const acceptRequest = mutation\([\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(block).toContain("Only the recipient can accept this request.");
  });

  it("registers dm_send rate limit action", () => {
    expect(socialWriteLimitForAction("dm_send")).toEqual({
      max: 60,
      label: "messages",
    });
  });

  it("exposes status probe without UI entry points", () => {
    expect(dmSrc).toContain("export const getDmFoundationStatus = query");
    expect(dmSrc).toContain("uiAvailable: false");
  });
});
