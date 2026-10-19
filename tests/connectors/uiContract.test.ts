import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { INTEGRATION_ADAPTERS } from "@/lib/automation/integrations";

describe("connectors UI contracts", () => {
  it("does not mark external providers available/active in the static registry", () => {
    for (const adapter of INTEGRATION_ADAPTERS.filter((a) => a.external)) {
      expect(adapter.available).toBe(false);
      expect(adapter.status).not.toBe("active");
      expect(adapter.status).not.toBe("connected");
    }
    expect(
      INTEGRATION_ADAPTERS.filter((a) =>
        ["giga3_gigalearn", "giga3_marketplace"].includes(a.id)
      ).every((a) => a.status === "active")
    ).toBe(true);
  });

  it("wires ConnectorsPanel into automation integrations tab", () => {
    const page = readFileSync(
      resolve(__dirname, "../../web/components/automation/AutomationPageClient.tsx"),
      "utf8"
    );
    expect(page).toContain("ConnectorsPanel");
    expect(page).not.toContain('adapter.available ? "Active" : "Planned"');
  });

  it("registers OAuth callback on Convex HTTP router", () => {
    const http = readFileSync(resolve(__dirname, "../../convex/http.ts"), "utf8");
    expect(http).toContain('/connectors/oauth/callback');
    expect(http).toContain("connectorsOAuthCallback");
  });

  it("keeps secrets out of NEXT_PUBLIC examples for connectors", () => {
    const docs = readFileSync(resolve(__dirname, "../../docs/CONNECTORS.md"), "utf8");
    expect(docs).toContain("GOOGLE_CONNECTOR_CLIENT_SECRET");
    expect(docs).not.toContain("NEXT_PUBLIC_GOOGLE_CONNECTOR_CLIENT_SECRET");
  });
});
