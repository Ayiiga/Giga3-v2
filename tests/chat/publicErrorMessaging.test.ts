import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INVALID_CREDENTIALS_PUBLIC_MESSAGE,
  publicAuthErrorMessage,
} from "../../web/lib/auth/publicAuthError";
import {
  ADVANCED_PERSONA_PAID_PLAN_MESSAGE,
  toUserFacingError,
} from "../../web/lib/errors/userMessage";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("public error UI wiring", () => {
  it("login form offers password reset for invalid credentials", () => {
    const src = read("web/components/chat/ChatLoginForm.tsx");
    expect(src).toContain("publicAuthErrorMessage");
    expect(src).toContain("isInvalidCredentialsMessage");
    expect(src).toContain("Reset your password");
    expect(src).toContain('setMode("forgot")');
  });

  it("chat error banner offers View plans and Try standard AI for persona entitlement", () => {
    const banner = read("web/components/chat/ChatErrorBanner.tsx");
    expect(banner).toContain("View plans");
    expect(banner).toContain("Try standard AI");
    expect(banner).toContain("siteConfig.links.pricing");
    expect(banner).toContain("onTryStandardAi");
    expect(banner).toContain("ADVANCED_PERSONA_PAID_PLAN_MESSAGE");

    const shell = read("web/components/chat/ChatShell.tsx");
    expect(shell).toContain("onTryStandardAi");
    expect(shell).toContain("changePersona(null)");
  });

  it("error boundary keeps diagnostics out of the customer-facing copy", () => {
    const src = read("web/components/chat/ChatErrorBoundary.tsx");
    expect(src).toContain("logClientDiagnostic");
    expect(src).toContain("toUserFacingError");
    expect(src).not.toContain("Deploy Convex backend");
    expect(src).not.toContain("GitHub Actions");
  });

  it("outbox flush reuses clientRequestId and guards concurrent sync (no duplicate sends)", () => {
    const hook = read("web/hooks/useChatPlatform.ts");
    expect(hook).toContain("syncingOutboxRef");
    expect(hook).toContain("row.clientRequestId");
    expect(hook).toContain("dispatchAccept");
    // Accept path must receive the stored id — not a freshly minted one on retry.
    expect(hook).toMatch(
      /dispatchAccept\(\s*token,\s*conversationId,\s*row\.content[\s\S]*?row\.clientRequestId/
    );

    const accept = read("convex/chatMessaging.ts");
    expect(accept).toContain("clientRequestId");
    expect(accept).toContain("by_clientRequest");
    expect(accept).toContain("Dedupe client retries");
  });
});

describe("end-to-end public message contracts", () => {
  it("successful-path strings stay free of Convex internals", () => {
    // Sign-in success has no error surface; assert helpers stay clean on empty/success-like input.
    expect(publicAuthErrorMessage("")).toBe("Could not complete sign in.");
    expect(toUserFacingError("")).toMatch(/try again/i);
    expect(INVALID_CREDENTIALS_PUBLIC_MESSAGE).not.toMatch(/Request ID|\.ts:/);
    expect(ADVANCED_PERSONA_PAID_PLAN_MESSAGE).not.toMatch(/Request ID|\.ts:|Convex/i);
  });
});
