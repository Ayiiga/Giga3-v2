/**
 * Self-service account deletion — confirmation rules + Settings wiring.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assertSelfAccountDeleteAllowed } from "../../convex/accountDeletion";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

describe("assertSelfAccountDeleteAllowed", () => {
  it("requires confirm email to match the session email", () => {
    expect(
      assertSelfAccountDeleteAllowed("user@example.com", "other@example.com")
    ).toEqual({ ok: false, reason: "confirm_mismatch" });
  });

  it("normalizes case and whitespace", () => {
    expect(
      assertSelfAccountDeleteAllowed("  User@Example.com ", "user@example.com")
    ).toEqual({ ok: true, email: "user@example.com" });
  });

  it("never allows deleting the protected founder inbox", () => {
    expect(
      assertSelfAccountDeleteAllowed("ayiiga3@gmail.com", "ayiiga3@gmail.com")
    ).toEqual({ ok: false, reason: "protected_email" });
  });

  it("rejects empty confirm", () => {
    expect(assertSelfAccountDeleteAllowed("user@example.com", "  ")).toEqual({
      ok: false,
      reason: "invalid_confirm_email",
    });
  });
});

describe("deleteMyAccount server + Settings UI wiring", () => {
  it("exports a public mutation that requires session + confirmEmail", () => {
    const src = read("convex/accountDeletion.ts");
    expect(src).toContain("export const deleteMyAccount = mutation");
    expect(src).toContain("requireSession(args.sessionToken, ctx)");
    expect(src).toContain("confirmEmail");
    expect(src).toContain("revokeSessionsInternal");
    expect(src).toContain("userCredentials");
    expect(src).toContain("conversations");
    // Must not be an internalMutation — users need client access.
    expect(src).not.toMatch(/export const deleteMyAccount = internalMutation/);
  });

  it("keeps ops-only wipe as internalMutation", () => {
    const cleanup = read("convex/cleanup.ts");
    expect(cleanup).toContain(
      "export const deleteUserAccountForResignupInternal = internalMutation"
    );
  });

  it("ships Delete account UI on Settings", () => {
    expect(existsSync(resolve(ROOT, "web/app/(marketing)/settings/page.tsx"))).toBe(
      true
    );
    const settings = read("web/components/account/AccountSettingsClient.tsx");
    expect(settings).toContain("DeleteAccountSection");
    const ui = read("web/components/account/DeleteAccountSection.tsx");
    expect(ui).toContain('data-testid="delete-account-section"');
    expect(ui).toContain('data-testid="delete-account-confirm"');
    expect(ui).toContain("api.accountDeletion.deleteMyAccount");
    expect(ui).toContain("Permanently delete");
  });
});
