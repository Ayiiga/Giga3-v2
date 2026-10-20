import { describe, expect, it } from "vitest";
import {
  buildGeneratedBookCoverSvg,
  generatedBookCoverDataUrl,
} from "../../web/lib/marketplace/generatedBookCover";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("generated book cover page", () => {
  it("builds an SVG cover plate with the title", () => {
    const svg = buildGeneratedBookCoverSvg({
      title: "From Idea to App: How to Build a Website",
      category: "Education",
      productType: "ebook",
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("From Idea to App");
    expect(svg).toContain("EDUCATION");
    expect(svg).toContain("Giga3 Marketplace");
  });

  it("returns a data URL usable by ProductCover", () => {
    const url = generatedBookCoverDataUrl({
      title: "Sample Ebook",
      productType: "ebook",
    });
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Sample Ebook");
  });

  it("ProductCover uses generated covers for book-like products without src", () => {
    const cover = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/ProductCover.tsx"),
      "utf8"
    );
    expect(cover).toContain("generatedBookCoverDataUrl");
    expect(cover).toContain('data-cover-state={isGenerated ? "generated" : "image"}');
    expect(cover).toContain("productType");
  });
});
