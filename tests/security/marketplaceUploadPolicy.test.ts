import {
  MarketplaceUploadIntent,
  marketplaceUploadsEnabled,
} from "../../convex/marketplaceUploadPolicy";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("marketplace upload safety gate", () => {
  it("is disabled unless the server environment explicitly enables it", () => {
    expect(marketplaceUploadsEnabled()).toBe(false);
    expect(marketplaceUploadsEnabled("false")).toBe(false);
    expect(marketplaceUploadsEnabled("true")).toBe(true);
  });

  it("defines a server-owned future finalization contract", () => {
    const intent: MarketplaceUploadIntent = {
      ownerId: "seller@example.com",
      purpose: "product_file",
      allowedContentTypes: ["application/pdf"],
      maxBytes: 1024,
      expiresAt: Date.now() + 60_000,
      status: "pending",
    };
    expect(intent.status).toBe("pending");
  });

  it("enforces the server gate before raw upload URLs and attachment", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    expect(source).toMatch(/generateUploadUrl[\s\S]*?assertMarketplaceUploadsEnabled/);
    expect(source).toMatch(/attachListingFile[\s\S]*?assertMarketplaceUploadsEnabled/);
  });
});
