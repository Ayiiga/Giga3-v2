import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CREATOR_TIP_CATALOG, getCreatorTipTier } from "../../web/lib/gigasocial/tipCatalog";

describe("Paystack tips and boosts", () => {
  it("exposes GHS tip tiers for MoMo/card checkout", () => {
    expect(CREATOR_TIP_CATALOG.length).toBeGreaterThanOrEqual(3);
    expect(getCreatorTipTier("spark")?.amountGhs).toBe(1);
    expect(getCreatorTipTier("crown")?.amountGhs).toBe(5);
    for (const tier of CREATOR_TIP_CATALOG) {
      expect(tier.amountGhs).toBeGreaterThan(0);
    }
  });

  it("wires Paystack initialize actions for tips and boosts", () => {
    const src = readFileSync(resolve(__dirname, "../../convex/paystack.ts"), "utf8");
    expect(src).toContain("initializeCreatorGiftPayment");
    expect(src).toContain("initializeBoostPayment");
    expect(src).toContain("creator_gift");
    expect(src).toContain("boost_campaign");
    expect(src).toContain("mobile_money");
    expect(src).toContain("fulfillCreatorGiftInternal");
    expect(src).toContain("activateBoostCampaignInternal");
  });

  it("blocks free unpaid boost creation", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    const start = src.indexOf("export const createBoostCampaign");
    expect(start).toBeGreaterThan(-1);
    const next = src.indexOf("export const ", start + 10);
    const handler = src.slice(start, next === -1 ? undefined : next);
    expect(handler).toContain("Paystack");
    expect(handler).not.toContain('status: "active"');
  });

  it("uses Paystack from tip and boost UI", () => {
    const tip = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/economy/GigaSocialTipButton.tsx"),
      "utf8"
    );
    const boost = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/economy/GigaSocialBoostPanel.tsx"),
      "utf8"
    );
    expect(tip).toContain("initializeCreatorGiftPayment");
    expect(tip).toContain("Pay with MoMo, card, or bank");
    expect(boost).toContain("initializeBoostPayment");
    expect(boost).toContain("Pay & launch with Paystack");
  });
});
