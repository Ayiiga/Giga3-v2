import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decideSocialAccountLink,
  decideSocialExplicitLink,
  socialLinkRejectionMessage,
} from "../../convex/socialAuth/accountLink";
import {
  googleClientIdCandidates,
  missingEnvKeysForSocialProvider,
  socialOAuthCallbackUrl,
  SOCIAL_AUTH_PROVIDER_CONFIGS,
} from "../../convex/socialAuth/registry";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("social account linking policy", () => {
  it("creates a new account when no email or subject exists", () => {
    expect(
      decideSocialAccountLink({
        provider: "microsoft",
        subject: "ms-sub-1",
        email: "New@Example.com",
        emailVerified: true,
        bySubject: null,
        byEmail: null,
      })
    ).toEqual({ kind: "create", email: "new@example.com" });
  });

  it("signs in by stable subject even if email changed", () => {
    expect(
      decideSocialAccountLink({
        provider: "github",
        subject: "42",
        email: "changed@example.com",
        emailVerified: true,
        bySubject: { userId: "original@example.com", suspended: false },
        byEmail: { userId: "changed@example.com", suspended: false },
      })
    ).toEqual({ kind: "sign-in", email: "original@example.com" });
  });

  it("never auto-merges solely because emails match", () => {
    const decision = decideSocialAccountLink({
      provider: "apple",
      subject: "apple-sub",
      email: "user@example.com",
      emailVerified: true,
      bySubject: null,
      byEmail: { userId: "user@example.com", suspended: false },
    });
    expect(decision).toEqual({
      kind: "reject",
      code: "account_exists_requires_link",
    });
    expect(socialLinkRejectionMessage("account_exists_requires_link")).toMatch(
      /Settings/i
    );
  });

  it("allows explicit link only when session email matches verified provider email", () => {
    expect(
      decideSocialExplicitLink({
        subject: "ms-2",
        email: "user@example.com",
        emailVerified: true,
        sessionUserId: "user@example.com",
        bySubject: null,
        existingSubjectForUser: null,
      })
    ).toEqual({ kind: "link", email: "user@example.com" });

    expect(
      decideSocialExplicitLink({
        subject: "ms-2",
        email: "other@example.com",
        emailVerified: true,
        sessionUserId: "user@example.com",
        bySubject: null,
        existingSubjectForUser: null,
      }).kind
    ).toBe("reject");
  });
});

describe("social auth registry boundary", () => {
  it("uses /auth/oauth/callback not the connector callback", () => {
    expect(
      socialOAuthCallbackUrl({
        CONVEX_SITE_URL: "https://perfect-lark-521.convex.site",
      } as NodeJS.ProcessEnv)
    ).toBe("https://perfect-lark-521.convex.site/auth/oauth/callback");
    expect(read("convex/http.ts")).toContain('/auth/oauth/callback');
    expect(read("convex/http.ts")).toContain('/connectors/oauth/callback');
  });

  it("does not require connector env keys for social providers", () => {
    for (const provider of SOCIAL_AUTH_PROVIDER_CONFIGS) {
      for (const key of provider.requiredEnvKeys) {
        expect(key).not.toMatch(/_CONNECTOR_/);
      }
      expect(
        missingEnvKeysForSocialProvider(provider, {} as NodeJS.ProcessEnv).join(
          ","
        )
      ).not.toMatch(/CONNECTOR/);
    }
  });

  it("accepts AUTH_GOOGLE_ID as a Google audience candidate", () => {
    expect(
      googleClientIdCandidates({
        AUTH_GOOGLE_ID: "auth-google-id.apps.googleusercontent.com",
      } as NodeJS.ProcessEnv)
    ).toEqual(["auth-google-id.apps.googleusercontent.com"]);
  });

  it("keeps social OAuth secrets server-side and sessions on verified flows", () => {
    const oauth = read("convex/socialAuth/oauth.ts");
    expect(oauth).toContain("createSessionToken");
    expect(oauth).toContain("exchangeSocialAuthCode");
    expect(oauth).not.toContain("GOOGLE_CONNECTOR_CLIENT");
    expect(oauth).not.toContain("MICROSOFT_CONNECTOR_CLIENT");
    expect(read("convex/googleAuthActions.ts")).toContain("verifyGoogleIdToken");
    expect(read("convex/googleAuthActions.ts")).toContain("linkGoogleIdentity");
  });
});
