import { describe, expect, it } from "vitest";
import { TREND_CURATED_SECTIONS } from "@/lib/trends/trendDashboard";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("trend dashboard honesty", () => {
  it("does not ship fabricated percentage metrics", () => {
    const serialized = JSON.stringify(TREND_CURATED_SECTIONS);
    expect(serialized).not.toMatch(/\d+%/);
    expect(serialized).not.toMatch(/\+\d+/);
  });

  it("labels sections as editorial, not live analytics", () => {
    for (const section of TREND_CURATED_SECTIONS) {
      expect(section.note.toLowerCase()).toMatch(/curated|editorial|browse|not shown|not live/);
    }
  });

  it("uses honest copy in TrendDashboardPanel", () => {
    const panel = readFileSync(
      resolve(__dirname, "../../web/components/trends/TrendDashboardPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("not live platform analytics");
    expect(panel).not.toMatch(/\d+%/);
  });
});
