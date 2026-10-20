import { describe, expect, it } from "vitest";
import {
  EXTERNAL_CONNECTORS,
  PLATFORM_CONNECTORS,
  isProviderConfigured,
  missingEnvKeysForProvider,
  oauthCallbackUrl,
} from "../../convex/connectors/registry";
import { CONNECTOR_STATUS_LABELS } from "../../convex/connectors/types";

describe("connector registry", () => {
  it("keeps GigaLearn and Marketplace as platform connectors", () => {
    const ids = PLATFORM_CONNECTORS.map((c) => c.id);
    expect(ids).toContain("giga3_gigalearn");
    expect(ids).toContain("giga3_marketplace");
    expect(PLATFORM_CONNECTORS.every((c) => c.href)).toBe(true);
  });

  it("lists the six external providers with real adapter metadata", () => {
    expect(EXTERNAL_CONNECTORS.map((c) => c.id).sort()).toEqual(
      [
        "gmail",
        "google_drive",
        "moodle",
        "notion",
        "outlook_calendar",
        "zoom",
      ].sort()
    );
    for (const provider of EXTERNAL_CONNECTORS) {
      expect(provider.capabilities.length).toBeGreaterThan(0);
      expect(provider.setupNotes.length).toBeGreaterThan(10);
    }
  });

  it("reports missing OAuth env keys accurately", () => {
    const drive = EXTERNAL_CONNECTORS.find((c) => c.id === "google_drive")!;
    expect(
      missingEnvKeysForProvider(drive, {
        GOOGLE_CONNECTOR_CLIENT_ID: "",
      } as NodeJS.ProcessEnv)
    ).toEqual(["GOOGLE_CONNECTOR_CLIENT_ID", "GOOGLE_CONNECTOR_CLIENT_SECRET"]);
    expect(
      isProviderConfigured(drive, {
        GOOGLE_CONNECTOR_CLIENT_ID: "id",
        GOOGLE_CONNECTOR_CLIENT_SECRET: "secret",
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it("treats Moodle as configurable without platform secrets", () => {
    const moodle = EXTERNAL_CONNECTORS.find((c) => c.id === "moodle")!;
    expect(isProviderConfigured(moodle, {} as NodeJS.ProcessEnv)).toBe(true);
  });

  it("builds OAuth callback from convex site URL", () => {
    expect(
      oauthCallbackUrl({
        CONVEX_SITE_URL: "https://perfect-lark-521.convex.site",
      } as NodeJS.ProcessEnv)
    ).toBe("https://perfect-lark-521.convex.site/connectors/oauth/callback");
  });

  it("exposes human status labels used by the UI", () => {
    expect(CONNECTOR_STATUS_LABELS.needs_configuration).toMatch(/configuration/i);
    expect(CONNECTOR_STATUS_LABELS.connected).toBe("Connected");
    expect(CONNECTOR_STATUS_LABELS.planned).toBe("Planned");
  });
});
