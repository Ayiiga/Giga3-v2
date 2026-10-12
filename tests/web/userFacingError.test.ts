import { describe, expect, it } from "vitest";
import {
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_CREDENTIALS_PUBLIC_MESSAGE,
  publicAuthErrorMessage,
} from "../../web/lib/auth/publicAuthError";
import {
  ADVANCED_PERSONA_PAID_PLAN_MESSAGE,
  NETWORK_OFFLINE_MESSAGE,
  stripConvexErrorNoise,
  toUserFacingError,
} from "../../web/lib/errors/userMessage";

const LEAK_FRAGMENTS = [
  "Request ID",
  "authPasswordActions.ts",
  "chatMessaging.ts",
  "entitlements.ts",
  "Uncaught",
  " at handler",
  " at requireFeature",
];

function expectNoInternalLeak(message: string) {
  for (const fragment of LEAK_FRAGMENTS) {
    expect(message, `leaked "${fragment}"`).not.toContain(fragment);
  }
}

describe("public auth error messaging", () => {
  it("handles the exact production UnauthorizedError string", () => {
    const raw =
      "Error Uncaught UnauthorizedError: Incorrect email or password. at handler (.../convex/authPasswordActions.ts:238:4)";
    expect(stripConvexErrorNoise(raw)).toBe(INVALID_CREDENTIALS_MESSAGE);
    const shown = publicAuthErrorMessage(new Error(raw));
    expect(shown).toBe(INVALID_CREDENTIALS_PUBLIC_MESSAGE);
    expect(shown).toContain(INVALID_CREDENTIALS_MESSAGE);
    expect(shown).toMatch(/Forgot password/i);
    expectNoInternalLeak(shown);
  });

  it("strips Server Error + Request ID UnauthorizedError wrappers", () => {
    const raw =
      "[Request ID: b43b80fe0c33054b] Server Error Uncaught UnauthorizedError: Incorrect email or password. at handler (../convex/authPasswordActions.ts:238:4)";
    const shown = publicAuthErrorMessage(new Error(raw));
    expect(shown).toBe(INVALID_CREDENTIALS_PUBLIC_MESSAGE);
    expectNoInternalLeak(shown);
  });

  it("preserves ordinary field validation messages", () => {
    expect(publicAuthErrorMessage(new Error("Enter a valid email address."))).toBe(
      "Enter a valid email address."
    );
    expect(publicAuthErrorMessage(new Error("Passwords do not match."))).toBe(
      "Passwords do not match."
    );
  });

  it("strips Convex stack noise from advanced persona entitlement errors", () => {
    const raw =
      "Server Error Uncaught Error: You've used all 15 free persona questions for today. Upgrade for unlimited advanced personas, or continue without a persona. at requireAndConsumeAdvancedPersonaAccess (../../convex/entitlements.ts:180:8) at async handler (../../convex/chatMessaging.ts:189:8)";
    expect(stripConvexErrorNoise(raw)).toBe(
      "You've used all 15 free persona questions for today. Upgrade for unlimited advanced personas, or continue without a persona."
    );
    expect(toUserFacingError(new Error(raw))).toContain("15 free persona");
    expect(toUserFacingError(new Error(raw))).not.toContain("entitlements.ts");
  });
});

describe("AI entitlement and chat error messaging", () => {
  it("maps the advanced-persona subscription screenshot error to paid-plan copy", () => {
    const raw = [
      "[Request ID: 9d280b9d9e93103b]",
      "Server Error Uncaught Error: Advanced personas require a paid subscription. at requireFeature (../../convex/entitlements.ts:108:8) at requireEntitlementForEmail (../../convex/entitlements.ts:139:0) at async handler (../../convex/chatMessaging.ts:189:8)",
    ].join("\n");

    const shown = toUserFacingError(raw);
    expect(shown).toBe(ADVANCED_PERSONA_PAID_PLAN_MESSAGE);
    expect(shown).not.toContain("Advanced personas");
    expectNoInternalLeak(shown);
  });

  it("does not label network or offline failures as subscription restrictions", () => {
    expect(toUserFacingError(new Error("Failed to fetch"))).toBe(NETWORK_OFFLINE_MESSAGE);
    expect(toUserFacingError("TypeError: NetworkError when attempting to fetch resource.")).toBe(
      NETWORK_OFFLINE_MESSAGE
    );
    expect(toUserFacingError("Failed to fetch")).not.toMatch(/paid plan|subscription/i);
  });

  it("maps unknown Convex envelopes to a generic actionable message", () => {
    const raw =
      "[CONVEX M(chatMessaging:acceptMessage)] [Request ID: deadbeefcafebabe] Server Error Uncaught Error: boom.internal at handler (../../convex/chatMessaging.ts:189:8) Called by client";
    const shown = toUserFacingError(raw);
    expect(shown).toMatch(/try again|refresh/i);
    expectNoInternalLeak(shown);
  });

  it("keeps tip / gifts mapping without leaking Convex paths", () => {
    const raw =
      "[CONVEX M(gigaSocialEconomy:sendCreatorGift)] [Request ID: 5cbd01ce5640bb42] Server Error Uncaught Error: This creator has not unlocked the Gifts Hub yet. at handler (../../convex/gigaSocialEconomy.ts:463:20) Called by client";
    const shown = toUserFacingError(raw);
    expect(shown).toContain("tips");
    expectNoInternalLeak(shown);
  });
});
