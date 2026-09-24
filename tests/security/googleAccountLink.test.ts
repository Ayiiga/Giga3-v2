import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decideGoogleAccountLink,
  googleProfilePatch,
  type GoogleLinkAccount,
} from "../../convex/googleAccountLink";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

function account(overrides: Partial<GoogleLinkAccount> = {}): GoogleLinkAccount {
  return {
    email: "user@example.com",
    googleSub: null,
    suspended: false,
    ...overrides,
  };
}

describe("Google account linking", () => {
  it("creates an account for a new verified Google user", () => {
    const decision = decideGoogleAccountLink({
      googleSub: "sub-new",
      email: "New.User@Example.com",
      emailVerified: true,
      bySub: null,
      byEmail: null,
    });
    expect(decision).toEqual({ kind: "create", email: "new.user@example.com" });
  });

  it("signs a returning Google user into the account stored for that sub", () => {
    const decision = decideGoogleAccountLink({
      googleSub: "sub-return",
      email: "changed@example.com",
      emailVerified: true,
      bySub: account({ email: "original@example.com", googleSub: "sub-return" }),
      byEmail: account({ email: "changed@example.com" }),
      });
    expect(decision).toEqual({ kind: "sign-in", email: "original@example.com" });
  });

  it("links a verified Google identity onto an existing password account", () => {
    const decision = decideGoogleAccountLink({
      googleSub: "sub-link",
      email: "user@example.com",
      emailVerified: true,
      bySub: null,
      byEmail: account(),
    });
    expect(decision).toEqual({ kind: "link", email: "user@example.com" });
  });

  it("does not create a duplicate when the email already exists", () => {
    const cases = [
      decideGoogleAccountLink({
        googleSub: "sub-link",
        email: "user@example.com",
        emailVerified: true,
        bySub: null,
        byEmail: account(),
      }),
      decideGoogleAccountLink({
        googleSub: "sub-other",
        email: "user@example.com",
        emailVerified: true,
        bySub: null,
        byEmail: account({ googleSub: "sub-existing" }),
      }),
      decideGoogleAccountLink({
        googleSub: "sub-return",
        email: "user@example.com",
        emailVerified: true,
        bySub: account({ googleSub: "sub-return" }),
        byEmail: account({ googleSub: "sub-return" }),
      }),
    ];
    expect(cases.every((decision) => decision.kind !== "create")).toBe(true);
  });

  it("rejects a second Google account for an email that is already linked", () => {
    const decision = decideGoogleAccountLink({
      googleSub: "sub-attacker",
      email: "user@example.com",
      emailVerified: true,
      bySub: null,
      byEmail: account({ googleSub: "sub-owner" }),
    });
    expect(decision).toEqual({ kind: "reject", code: "linked_to_other_google" });
  });

  it("rejects unverified emails and suspended accounts", () => {
    expect(
      decideGoogleAccountLink({
        googleSub: "sub",
        email: "user@example.com",
        emailVerified: false,
        bySub: null,
        byEmail: null,
      })
    ).toEqual({ kind: "reject", code: "unverified_email" });
    expect(
      decideGoogleAccountLink({
        googleSub: "sub",
        email: "user@example.com",
        emailVerified: true,
        bySub: account({ suspended: true, googleSub: "sub" }),
        byEmail: null,
      })
    ).toEqual({ kind: "reject", code: "suspended" });
  });

  it("does not overwrite an existing profile or store a non-HTTPS picture", () => {
    expect(
      googleProfilePatch({
        name: "Incoming",
        picture: "javascript:alert(1)",
        existingName: "Kept",
        existingImage: "https://cdn.example/old.png",
      })
    ).toEqual({});
    expect(
      googleProfilePatch({
        name: "Ada",
        picture: "https://lh3.googleusercontent.com/a/ada",
      })
    ).toEqual({
      name: "Ada",
      image: "https://lh3.googleusercontent.com/a/ada",
    });
  });

  it("password sign-in does not invent a password for a Google-only account", () => {
    const actions = read("convex/authPasswordActions.ts");
    const start = actions.indexOf("export const signInWithPassword ");
    const next = actions.indexOf("\nexport ", start + 1);
    const signIn = actions.slice(start, next);
    expect(signIn).toContain("user?.googleSub");
    expect(signIn).toContain("Continue with Google");
    expect(signIn).not.toContain("hashPassword");
    expect(signIn).toContain("verifyPassword(");
  });
});
