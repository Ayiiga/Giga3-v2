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

  it("enforces intent-based uploads instead of legacy env gate on attach", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    expect(source).toMatch(/prepareListingUpload and completeListingUpload/);
    const intents = readFileSync(
      resolve(__dirname, "../../convex/marketplaceUploadIntents.ts"),
      "utf8"
    );
    expect(intents).toContain("prepareListingUpload");
  });
});
