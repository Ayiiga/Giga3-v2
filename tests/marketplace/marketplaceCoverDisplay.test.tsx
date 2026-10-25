/**
 * @vitest-environment happy-dom
 */
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import {
  isBookLikeProduct,
  ProductCover,
} from "../../web/components/marketplace/ProductCover";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(props: {
  src?: string | null;
  title: string;
  category?: string;
  productType?: string | null;
  fit?: "cover" | "contain";
}) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(createElement(ProductCover, props));
  });
  return host;
}

describe("marketplace ProductCover display", () => {
  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    if (host) {
      host.remove();
      host = null;
    }
  });

  it("renders the author-uploaded cover for the correct product", () => {
    const el = mount({
      src: "https://cdn.example.com/covers/idea-to-app.png",
      title: "From Idea to App",
      category: "Education",
      productType: "ebook",
    });
    const img = el.querySelector('img[alt="From Idea to App cover"]') as HTMLImageElement | null;
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe(
      "https://cdn.example.com/covers/idea-to-app.png"
    );
    expect(el.querySelector('[data-cover-state="image"]')).toBeTruthy();
    expect(el.querySelector('[data-listing-title="From Idea to App"]')).toBeTruthy();
    expect(img?.className).toContain("object-contain");
  });

  it("shows distinct covers for different ebooks in a grid", () => {
    const a = mount({
      src: "https://cdn.example.com/a.jpg",
      title: "Ebook A",
      productType: "ebook",
    });
    const imgA = a.querySelector("img")?.getAttribute("src");
    act(() => root?.unmount());
    a.remove();

    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root?.render(
        createElement(ProductCover, {
          src: "https://cdn.example.com/b.jpg",
          title: "Ebook B",
          productType: "ebook",
        })
      );
    });
    const imgB = host.querySelector("img")?.getAttribute("src");
    expect(imgA).toBe("https://cdn.example.com/a.jpg");
    expect(imgB).toBe("https://cdn.example.com/b.jpg");
    expect(imgA).not.toEqual(imgB);
  });

  it("uses branded fallback when cover is missing (not a fabricated teal cover)", () => {
    const el = mount({
      src: null,
      title: "Ultimate Productivity eBook",
      category: "Productivity",
      productType: "ebook",
    });
    expect(el.querySelector('[data-cover-state="fallback"]')).toBeTruthy();
    expect(el.querySelector("img")).toBeNull();
    expect(el.textContent).toContain("Ultimate Productivity eBook");
    expect(el.innerHTML).not.toContain("data:image/svg+xml");
  });

  it("fails gracefully to branded fallback on invalid image URLs", () => {
    const el = mount({
      src: "https://cdn.example.com/missing-cover.png",
      title: "Broken Cover Book",
      productType: "ebook",
    });
    const img = el.querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    act(() => {
      img.dispatchEvent(new Event("error"));
    });
    expect(el.querySelector('[data-cover-state="fallback"]')).toBeTruthy();
    expect(el.querySelector("img")).toBeNull();
  });

  it("treats ebook productType as book-like even in non-Education categories", () => {
    expect(
      isBookLikeProduct({ category: "Productivity", productType: "ebook" })
    ).toBe(true);
  });
});

describe("marketplace cover wiring across Market views", () => {
  it("browse, item, storefront, and purchases pass productType into ProductCover", () => {
    for (const rel of [
      "MarketplaceBrowseClient.tsx",
      "MarketplaceItemClient.tsx",
      "CreatorStorefrontClient.tsx",
      "MarketplacePurchasesClient.tsx",
    ]) {
      const src = readFileSync(
        resolve(__dirname, `../../web/components/marketplace/${rel}`),
        "utf8"
      );
      expect(src).toContain("ProductCover");
      expect(src).toContain("productType=");
    }
  });

  it("browse and item share the same coverImageUrl field from resolved listings", () => {
    const browse = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceBrowseClient.tsx"),
      "utf8"
    );
    const item = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceItemClient.tsx"),
      "utf8"
    );
    expect(browse).toContain("src={item.coverImageUrl}");
    expect(item).toContain("src={listing.coverImageUrl}");
  });

  it("sell flow persists coverStorageId and allows cover re-upload on existing listings", () => {
    const upload = readFileSync(
      resolve(__dirname, "../../convex/marketplaceUploadIntents.ts"),
      "utf8"
    );
    const sell = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceSellClient.tsx"),
      "utf8"
    );
    const marketplace = readFileSync(
      resolve(__dirname, "../../convex/marketplace.ts"),
      "utf8"
    );
    expect(upload).toContain("coverStorageId: args.storageId");
    expect(sell).toContain('purpose: "product_file" | "cover_image"');
    expect(sell).toContain("Upload cover");
    expect(sell).toContain("uploadCover");
    expect(marketplace).toContain("hasDurableCover");
    expect(marketplace).toContain("isEphemeralConvexStorageUrl");
  });

  it("schedules cover storage backfill without changing purchase/checkout paths", () => {
    const crons = readFileSync(resolve(__dirname, "../../convex/crons.ts"), "utf8");
    const marketplace = readFileSync(
      resolve(__dirname, "../../convex/marketplace.ts"),
      "utf8"
    );
    const payments = readFileSync(
      resolve(__dirname, "../../convex/marketplacePayments.ts"),
      "utf8"
    );
    expect(crons).toContain("backfillCoverStorageIds");
    expect(marketplace).toContain("Paystack");
    expect(payments).toContain("marketplace/purchases");
    // Cover fix must not touch Paystack fulfilment.
    expect(payments).not.toContain("coverStorageId");
  });
});
