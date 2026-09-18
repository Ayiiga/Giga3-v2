import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODAL_PACK_ID,
  PAYSTACK_MODAL_PACKS,
  channelsForPayMethod,
  getModalPack,
} from "@/lib/billing/paystackPacks";

describe("credits paystack modal packs", () => {
  it("defaults to Pro 250cr GH₵150", () => {
    expect(DEFAULT_MODAL_PACK_ID).toBe("pro");
    expect(getModalPack("pro")).toMatchObject({
      credits: 250,
      priceGhs: 150,
      productId: "sub_pro_monthly",
      recurring: true,
      popular: true,
    });
  });

  it("maps every purchasable pack to a real backend product", () => {
    const purchasable = PAYSTACK_MODAL_PACKS.filter((p) => p.productId);
    expect(purchasable.length).toBeGreaterThanOrEqual(5);
    expect(getModalPack("basic").productId).toBe("sub_basic_monthly");
    expect(getModalPack("premium").productId).toBe("sub_premium_monthly");
    expect(getModalPack("topup60").productId).toBe("credits_60");
    expect(getModalPack("topup150").productId).toBe("credits_150");
    expect(getModalPack("free").productId).toBeNull();
  });

  it("keeps honest 1:1 pricing on one-time top-ups", () => {
    for (const p of PAYSTACK_MODAL_PACKS.filter((x) => !x.recurring && x.productId)) {
      expect(p.priceGhs).toBe(p.credits);
    }
  });

  it("maps payment methods to Paystack channels", () => {
    expect(channelsForPayMethod("momo")).toEqual(["mobile_money"]);
    expect(channelsForPayMethod("card")).toEqual(["card"]);
    expect(channelsForPayMethod("bank")).toContain("bank_transfer");
  });
});
