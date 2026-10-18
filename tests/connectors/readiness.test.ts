import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXTERNAL_CONNECTORS,
  isProviderConfigured,
  missingEnvKeysForProvider,
  oauthCallbackUrl,
} from "../../convex/connectors/registry";
import { CONNECTOR_STATUS_LABELS } from "../../convex/connectors/types";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("connector readiness accuracy", () => {
  it("marks OAuth providers needs_configuration when secrets are missing", () => {
    const empty = {} as NodeJS.ProcessEnv;
    for (const id of [
      "google_drive",
      "gmail",
      "outlook_calendar",
      "zoom",
      "notion",
    ] as const) {
      const provider = EXTERNAL_CONNECTORS.find((c) => c.id === id)!;
      expect(isProviderConfigured(provider, empty)).toBe(false);
      expect(missingEnvKeysForProvider(provider, empty).length).toBeGreaterThan(0);
      for (const key of missingEnvKeysForProvider(provider, empty)) {
        expect(key).toMatch(/_CONNECTOR_/);
        expect(key).not.toMatch(/^AUTH_/);
        expect(key).not.toBe("GOOGLE_CLIENT_ID");
      }
    }
  });

  it("marks OAuth providers configured only when all required secrets are set", () => {
    const env = {
      GOOGLE_CONNECTOR_CLIENT_ID: "g-id",
      GOOGLE_CONNECTOR_CLIENT_SECRET: "g-secret",
      MICROSOFT_CONNECTOR_CLIENT_ID: "m-id",
      MICROSOFT_CONNECTOR_CLIENT_SECRET: "m-secret",
      ZOOM_CONNECTOR_CLIENT_ID: "z-id",
      ZOOM_CONNECTOR_CLIENT_SECRET: "z-secret",
      NOTION_CONNECTOR_CLIENT_ID: "n-id",
      NOTION_CONNECTOR_CLIENT_SECRET: "n-secret",
    } as NodeJS.ProcessEnv;
    for (const provider of EXTERNAL_CONNECTORS.filter((p) => p.authKind === "oauth2")) {
      expect(isProviderConfigured(provider, env)).toBe(true);
      expect(missingEnvKeysForProvider(provider, env)).toEqual([]);
    }
  });

  it("keeps Moodle available without platform OAuth secrets", () => {
    const moodle = EXTERNAL_CONNECTORS.find((c) => c.id === "moodle")!;
    expect(isProviderConfigured(moodle, {} as NodeJS.ProcessEnv)).toBe(true);
  });

  it("builds the production Convex callback URL used by provider consoles", () => {
    expect(
      oauthCallbackUrl({
        CONVEX_SITE_URL: "https://perfect-lark-521.convex.site",
      } as NodeJS.ProcessEnv)
    ).toBe("https://perfect-lark-521.convex.site/connectors/oauth/callback");
  });

  it("exposes readiness query that never returns secret values", () => {
    const src = read("convex/connectors/status.ts");
    expect(src).toContain("export const getConnectorDeploymentReadiness");
    expect(src).toContain("missingEnvKeys");
    expect(src).toContain("dedicatedKeyConfigured");
    expect(src).toContain("oauthCallbackUrl");
    expect(src).toContain("separationNote");
    expect(src).toContain("microsoft");
    expect(src).toContain("warnsPersonalAccounts");
    expect(src).toContain("googleConnector");
    expect(src).not.toContain("CLIENT_SECRET]");
  });

  it("keeps connector callback separate from social login callback", () => {
    const http = read("convex/http.ts");
    expect(http).toContain('/connectors/oauth/callback');
    expect(http).toContain('/auth/oauth/callback');
  });

  it("uses human status labels for configuration and connection states", () => {
    expect(CONNECTOR_STATUS_LABELS.needs_configuration).toMatch(/configuration/i);
    expect(CONNECTOR_STATUS_LABELS.available).toMatch(/available/i);
    expect(CONNECTOR_STATUS_LABELS.connected).toBe("Connected");
    expect(CONNECTOR_STATUS_LABELS.needs_reauth).toMatch(/reauth|reauthor/i);
    expect(CONNECTOR_STATUS_LABELS.temporarily_unavailable).toMatch(/unavailable/i);
  });

  it("UI shows missing env key names but not secret values", () => {
    const panel = read("web/components/automation/ConnectorsPanel.tsx");
    expect(panel).toContain("missingEnvKeys");
    expect(panel).toContain("Needs Convex env");
    expect(panel).not.toContain("CLIENT_SECRET=");
    expect(panel).toContain("validateMoodleSiteUrl");
  });
});
