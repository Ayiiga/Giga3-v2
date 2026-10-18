import { describe, expect, it } from "vitest";
import {
  mapConnectorOAuthError,
  resolveMicrosoftConnectorTenant,
} from "../../convex/connectors/oauthErrors";
import { microsoftAuthUrl } from "../../convex/connectors/providers/microsoft";
import { googleAuthUrl } from "../../convex/connectors/providers/google";
import { oauthCallbackUrl } from "../../convex/connectors/registry";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("Microsoft connector authority", () => {
  it("defaults to /common for work + personal accounts", () => {
    expect(resolveMicrosoftConnectorTenant(undefined)).toEqual({
      tenant: "common",
      kind: "common",
      warnsPersonalAccounts: false,
    });
    expect(resolveMicrosoftConnectorTenant("  ")).toMatchObject({ tenant: "common" });
    const url = microsoftAuthUrl({
      clientId: "ms-client",
      redirectUri: "https://perfect-lark-521.convex.site/connectors/oauth/callback",
      scopes: ["openid", "User.Read", "Calendars.ReadWrite", "offline_access"],
      state: "abc",
    });
    expect(url).toContain("login.microsoftonline.com/common/oauth2/v2.0/authorize");
    expect(url).toContain("prompt=select_account");
    expect(url).toContain(encodeURIComponent("Calendars.ReadWrite"));
    expect(url).not.toContain("login.microsoftonline.com/organizations");
  });

  it("warns when tenant is organizations or tenant-specific", () => {
    expect(resolveMicrosoftConnectorTenant("organizations").warnsPersonalAccounts).toBe(
      true
    );
    expect(resolveMicrosoftConnectorTenant("contoso.onmicrosoft.com").kind).toBe(
      "tenant"
    );
    const orgUrl = microsoftAuthUrl({
      clientId: "ms",
      redirectUri: "https://cb",
      scopes: ["Calendars.ReadWrite"],
      state: "s",
      tenantId: "organizations",
    });
    expect(orgUrl).toContain("/organizations/oauth2/v2.0/authorize");
  });

  it("builds consumers authority when explicitly requested", () => {
    const url = microsoftAuthUrl({
      clientId: "ms",
      redirectUri: "https://cb",
      scopes: ["Calendars.ReadWrite"],
      state: "s",
      tenantId: "consumers",
    });
    expect(url).toContain("/consumers/oauth2/v2.0/authorize");
  });
});

describe("Google connector authorize URL", () => {
  it("uses accounts.google.com and connector callback", () => {
    const redirect = oauthCallbackUrl({
      CONVEX_SITE_URL: "https://perfect-lark-521.convex.site",
    } as NodeJS.ProcessEnv);
    const url = googleAuthUrl({
      clientId: "google-connector-client.apps.googleusercontent.com",
      redirectUri: redirect,
      scopes: [
        "openid",
        "email",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
      state: "st",
    });
    expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain(
      encodeURIComponent("https://perfect-lark-521.convex.site/connectors/oauth/callback")
    );
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
  });
});

describe("connector OAuth error mapping", () => {
  it("explains Microsoft unauthorized_client / consumers errors", () => {
    const msg = mapConnectorOAuthError(
      "unauthorized_client",
      "The client does not exist or is not enabled for consumers."
    );
    expect(msg).toMatch(/Entra|personal Microsoft|\/common/i);
    expect(msg.toLowerCase()).not.toContain("client_secret");
  });

  it("explains Google access_denied verification / testing mode", () => {
    const msg = mapConnectorOAuthError(
      "access_denied",
      "perfect-lark-521.convex.site has not completed the Google verification process. The app is currently being tested."
    );
    expect(msg).toMatch(/Testing|test user|verification/i);
    expect(msg).toMatch(/sign-in/i);
  });

  it("keeps connector env names separate from social login", () => {
    const oauth = read("convex/connectors/oauth.ts");
    expect(oauth).toContain("MICROSOFT_CONNECTOR_CLIENT_ID");
    expect(oauth).toContain("GOOGLE_CONNECTOR_CLIENT_ID");
    expect(oauth).not.toContain("AUTH_MICROSOFT_CLIENT_ID");
    expect(oauth).not.toContain("AUTH_GOOGLE_CLIENT_ID");
    expect(oauth).not.toMatch(/GOOGLE_CLIENT_ID(?!_)/);
  });
});
