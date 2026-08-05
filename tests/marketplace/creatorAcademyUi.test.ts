import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CREATOR_SERIES } from "../../web/lib/marketplace/creatorSeries";

const root = process.cwd();

describe("Creator Academy marketplace assets", () => {
  it("ships premium cover SVGs for all four series", () => {
    for (const series of CREATOR_SERIES) {
      const pathOnly = series.coverPath.split("?")[0]!;
      const abs = join(root, "web/public", pathOnly.replace(/^\//, ""));
      const svg = readFileSync(abs, "utf8");
      expect(svg).toContain("<svg");
      expect(svg.length).toBeGreaterThan(800);
      expect(svg).toContain("GIGA3 CREATOR ACADEMY");
      expect(svg).toContain("GHS 150.00");
    }
  });

  it("keeps Academy PDFs present for seed/download", () => {
    for (const series of CREATOR_SERIES) {
      const abs = join(root, "web/public", series.pdfPath.replace(/^\//, ""));
      const buf = readFileSync(abs);
      expect(buf.subarray(0, 4).toString()).toBe("%PDF");
      expect(buf.length).toBeGreaterThan(5_000);
    }
  });
});

describe("Marketplace purchase download UX", () => {
  it("My purchases uses direct Download PDF anchors", () => {
    const src = readFileSync(
      join(root, "web/components/marketplace/MarketplacePurchasesClient.tsx"),
      "utf8"
    );
    expect(src).toContain("Download PDF");
    expect(src).toContain("downloadUrl");
    expect(src).toContain("hasDownload");
    expect(src).toContain("Fraud-safe");
  });

  it("Creator Academy shelf stays simple with cover-led cards", () => {
    const src = readFileSync(
      join(root, "web/components/marketplace/CreatorAcademySection.tsx"),
      "utf8"
    );
    expect(src).toContain("Four official eBooks");
    expect(src).toContain("Paystack checkout");
    expect(src).not.toContain("PDF delivery after Paystack purchase");
  });
});
