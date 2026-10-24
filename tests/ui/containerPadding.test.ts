import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

describe("mobile edge padding + marketplace book cover", () => {
  it("Container includes default horizontal inset", () => {
    const src = read("web/components/ui/Container.tsx");
    expect(src).toContain("px-4");
    expect(src).toContain("sm:px-6");
    expect(src).toContain("lg:px-8");
  });

  it("ProductSeoHeader can render a cover image and relies on Container inset", () => {
    const src = read("web/components/seo/ProductSeoHeader.tsx");
    expect(src).toContain("coverImageUrl");
    expect(src).toContain('data-testid="product-seo-cover"');
    expect(src).toContain("<Container");
    // Non-compact no longer needs its own px — Container supplies it.
    expect(src).not.toMatch(/Container className=\{compact \? "[^"]*px-4/);
  });

  it("marketplace item page passes cover into SEO header", () => {
    const page = read("web/app/(marketing)/marketplace/item/[listingId]/page.tsx");
    expect(page).toContain("coverImageUrl={bundle.listing.coverImageUrl}");
    expect(page).toContain("coverImageAlt=");
    expect(page).toContain("compact");
  });

  it("marketplace item treats book cover as the primary preview", () => {
    const item = read("web/components/marketplace/MarketplaceItemClient.tsx");
    expect(item).toContain("isBookLikeProduct");
    expect(item).toContain("Book cover");
    expect(item).toContain('id="preview"');
    expect(item).toContain('fit={bookLike ? "contain" : "cover"}');
    expect(item).toContain("aspect-[3/4]");
  });

  it("ProductCover exposes book detection and image test id", () => {
    const cover = read("web/components/marketplace/ProductCover.tsx");
    expect(cover).toContain("export function isBookLikeProduct");
    expect(cover).toContain('data-testid="product-cover-image"');
    expect(cover).toContain('alt={`${title} cover`}');
    expect(cover).toContain('data-cover-state="fallback"');
    expect(cover).not.toContain("generatedBookCoverDataUrl");
  });
});
