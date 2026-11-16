import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRODUCT_CATALOG } from "../../web/lib/seo/productCatalog";
import { MARKETPLACE_PAGE_SHELL } from "../../web/lib/seo/productPageContent";

describe("Marketplace public copy — safe digital/physical separation", () => {
  it("describes physical listings as enquiries, never paid digital downloads", () => {
    expect(MARKETPLACE_PAGE_SHELL.description).toContain("physical goods are enquiry-only");
    expect(MARKETPLACE_PAGE_SHELL.whatItDoes).toContain("checkout, delivery and refunds for physical goods are not enabled");
    expect(MARKETPLACE_PAGE_SHELL.capabilities?.join(" ")).toContain("Physical goods cannot be paid for through the digital-download checkout");
  });

  it("keeps Paystack for approved digital downloads", () => {
    expect(MARKETPLACE_PAGE_SHELL.whatItDoes).toContain("digital files using Paystack");
    const market = PRODUCT_CATALOG.find(entry => entry.href === "/marketplace");
    expect(market?.description).toContain("Paystack for approved digital downloads");
    expect(market?.description).toContain("Physical checkout and delivery are not available");
  });

  it("makes the static SEO landing page honest before client JavaScript loads", () => {
    const path = resolve(__dirname, "../../web/app/(marketing)/marketplace/page.tsx");
    const source = readFileSync(path, "utf8");
    expect(source).toContain("enquiry-only for now");
    expect(source).toContain("Physical goods");
    expect(source).not.toContain("Buy securely in Ghana cedis or sell your own digital products");
  });
});
