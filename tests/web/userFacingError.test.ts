import { describe, expect, it } from "vitest";
import {
  stripConvexErrorNoise,
  toUserFacingError,
} from "../../web/lib/errors/userMessage";

describe("toUserFacingError", () => {
  it("strips Convex request wrappers from tip failures", () => {
    const raw =
      "[CONVEX M(gigaSocialEconomy:sendCreatorGift)] [Request ID: 5cbd01ce5640bb42] Server Error Uncaught Error: This creator has not unlocked the Gifts Hub yet. at handler (../../convex/gigaSocialEconomy.ts:463:20) Called by client";
    expect(stripConvexErrorNoise(raw)).toContain("Gifts Hub");
    expect(toUserFacingError(raw)).toBe(
      "This creator cannot receive tips yet. Please try again after refreshing."
    );
    expect(toUserFacingError(raw)).not.toContain("Request ID");
    expect(toUserFacingError(raw)).not.toContain("CONVEX");
  });

  it("strips Uncaught UnauthorizedError wrappers used by password auth", () => {
    const raw =
      "[Request ID: b43b80fe0c33054b] Server Error Uncaught UnauthorizedError: Incorrect email or password. at handler (../convex/authPasswordActions.ts:238:4)";
    expect(stripConvexErrorNoise(raw)).toBe("Incorrect email or password.");
  });

  it("never shows Convex Request ID or stack paths from the academic persona screenshot shape", () => {
    const raw = [
      "[Request ID: 9d280b9d9e93103b]",
      "Server Error Uncaught Error: Advanced personas require a paid subscription. at requireFeature (../../convex/entitlements.ts:108:8) at requireEntitlementForEmail (../../convex/entitlements.ts:139:0) at async handler (../../convex/chatMessaging.ts:189:8)",
    ].join("\n");

    const shown = toUserFacingError(raw);
    expect(shown).toBe(
      "Academic tutors include a free daily allowance. Upgrade for unlimited help, or continue without a persona."
    );
    expect(shown).not.toContain("Request ID");
    expect(shown).not.toContain("CONVEX");
    expect(shown).not.toContain("Uncaught");
    expect(shown).not.toContain("entitlements.ts");
    expect(shown).not.toContain("requireFeature");
    expect(shown).not.toContain("Advanced personas");
  });

  it("maps free tutor daily limit to short product copy", () => {
    const raw =
      "Server Error Uncaught Error: You've used today's free tutor questions (15). Upgrade for unlimited academic help, or continue without a persona. at requireAndConsumeAdvancedPersonaAccess (../../convex/entitlements.ts:180:8) at async handler (../../convex/chatMessaging.ts:189:8)";
    expect(toUserFacingError(new Error(raw))).toBe(
      "You've used today's free tutor questions. Upgrade for unlimited academic help, or continue without a persona."
    );
  });
});
