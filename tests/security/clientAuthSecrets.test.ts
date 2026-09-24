import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { publicAuthErrorMessage } from "../../web/lib/auth/publicAuthError";
import { GOOGLE_IDENTITY_SCRIPT_SRC } from "../../web/components/chat/GoogleSignInButton";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

const CLIENT_FILES = [
  "web/components/chat/ChatLoginForm.tsx",
  "web/components/chat/ChatResetPasswordClient.tsx",
  "web/components/chat/GoogleSignInButton.tsx",
  "web/components/chat/PasswordField.tsx",
  "web/lib/authGoogle.ts",
  "web/lib/authPassword.ts",
  "web/lib/auth/publicAuthError.ts",
];

describe("auth client bundle", () => {
  it("loads the current Google Identity Services script", () => {
    expect(GOOGLE_IDENTITY_SCRIPT_SRC).toBe("https://accounts.google.com/gsi/client");
    const button = read("web/components/chat/GoogleSignInButton.tsx");
    expect(button).toContain('ux_mode: "popup"');
    expect(button).toContain("use_fedcm_for_button: true");
    expect(button).not.toContain("apis.google.com/js/platform.js");
    expect(button).not.toContain("client_secret");
  });

  it("does not embed server secrets", () => {
    const forbidden = [
      "RESEND_API_KEY",
      "SESSION_SIGNING_SECRET",
      "PAYSTACK_SECRET_KEY",
      "GOOGLE_CLIENT_SECRET",
      "sk_live_",
      "BEGIN PRIVATE",
    ];
    for (const file of CLIENT_FILES) {
      const source = read(file);
      for (const secret of forbidden) {
        expect(source, `${file} contains ${secret}`).not.toContain(secret);
      }
    }
  });

  it("strips tokens from messages shown to the user", () => {
    const jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.signature";
    expect(publicAuthErrorMessage(new Error(`bad ${jwt}`))).toBe("bad [redacted]");
    expect(publicAuthErrorMessage(new Error("see https://x.test/reset?token=abc"), "Failed", ["abc"])).toBe(
      "Failed"
    );
    expect(publicAuthErrorMessage(new Error("Incorrect email or password."))).toBe(
      "Incorrect email or password."
    );
  });
});
