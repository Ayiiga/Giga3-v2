import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { PUBLISH_CONFIRMATION_BODY } from "../../convex/marketplacePublishCopy";
import {
  buildPromotionalCaption,
  buildShareDestination,
} from "../../web/lib/marketplace/promotionalCaption";

const marketplaceSrc = readFileSync(
  resolve(__dirname, "../../convex/marketplace.ts"),
  "utf8"
);
const notifySrc = readFileSync(
  resolve(__dirname, "../../convex/marketplacePublishNotify.ts"),
  "utf8"
);
const uploadSrc = readFileSync(
  resolve(__dirname, "../../convex/marketplaceUploadIntents.ts"),
  "utf8"
);

describe("marketplace publish confirmation", () => {
  it("schedules notify only after a draft→published transition", () => {
    const block =
      marketplaceSrc.match(/export const updateListing = mutation\([\s\S]*?\n}\);/)?.[0] ?? "";
    expect(block).toContain("wasPublished");
    expect(block).toContain("await ctx.db.patch(args.listingId, patch)");
    expect(block).toContain("notifyListingPublishedInternal");
    expect(block).toContain("args.status === \"published\" && !wasPublished");
  });

  it("claims publishConfirmationAt and uses dedupeKey before email", () => {
    expect(notifySrc).toContain("publishConfirmationAt");
    expect(notifySrc).toContain("marketplace_publish:");
    expect(notifySrc).toContain("by_dedupe");
    expect(notifySrc).toContain("sendPublishEmailInternal");
    expect(notifySrc).toContain("PUBLISH_CONFIRMATION_BODY");
    expect(PUBLISH_CONFIRMATION_BODY).toContain("Congratulations! Your product is now live");
  });

  it("persists coverStorageId on cover upload completion", () => {
    expect(uploadSrc).toContain("coverStorageId: args.storageId");
  });
});

describe("marketplace promotional sharing", () => {
  it("builds captions with canonical product URL and GHS price", () => {
    const caption = buildPromotionalCaption({
      listingId: "listing123",
      title: "Ghana Startup Playbook",
      description: "A practical guide for founders.",
      priceGhs: 150,
      category: "Business",
      productType: "ebook",
    });
    expect(caption).toContain("Ghana Startup Playbook");
    expect(caption).toContain("GHS");
    expect(caption).toContain("https://www.giga3ai.com/marketplace/item/listing123/");
  });

  it("encodes share destinations for major channels", () => {
    const url = "https://www.giga3ai.com/marketplace/item/abc/";
    const text = "Check this out";
    expect(buildShareDestination("whatsapp", { title: "T", text, url })).toContain(
      encodeURIComponent(url)
    );
    expect(buildShareDestination("facebook", { title: "T", text, url })).toContain(
      "facebook.com/sharer"
    );
    expect(buildShareDestination("telegram", { title: "T", text, url })).toContain("t.me/share");
    expect(buildShareDestination("linkedin", { title: "T", text, url })).toContain(
      "linkedin.com/sharing"
    );
  });

  it("wires promotion panel and OG cover metadata", () => {
    const sell = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceSellClient.tsx"),
      "utf8"
    );
    const itemPage = readFileSync(
      resolve(
        __dirname,
        "../../web/app/(marketing)/marketplace/item/[listingId]/page.tsx"
      ),
      "utf8"
    );
    const meta = readFileSync(
      resolve(__dirname, "../../web/lib/seo/publicMetadata.ts"),
      "utf8"
    );
    expect(sell).toContain("ProductPromotionPanel");
    expect(sell).toContain("previewToc");
    expect(itemPage).toContain("coverImageUrl");
    expect(itemPage).toContain("coverImageUrl={bundle.listing.coverImageUrl}");
    const itemClient = readFileSync(
      resolve(__dirname, "../../web/components/marketplace/MarketplaceItemClient.tsx"),
      "utf8"
    );
    expect(itemClient).toContain("Book cover");
    expect(itemClient).toContain("isBookLikeProduct");
    expect(meta).toContain("imageOverride");
  });
});
