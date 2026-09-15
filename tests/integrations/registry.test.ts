import { describe, expect, it } from "vitest";
import { getIntegration, listIntegrations } from "../../web/lib/integrations/registry";

describe("integration registry foundation", () => {
  it("lists provider descriptors without secrets", () => {
    const items = listIntegrations();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.name).toBeTruthy();
      expect(item.scopesSummary).toBeTruthy();
      expect(JSON.stringify(item)).not.toMatch(/secret|token|password/i);
    }
  });

  it("resolves known providers", () => {
    expect(getIntegration("github")?.name).toBe("GitHub");
    expect(getIntegration("notion")?.name).toBe("Notion");
  });
});
