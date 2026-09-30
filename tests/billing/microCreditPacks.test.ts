import { describe, expect, it } from "vitest";
import { getCreditPack } from "../../convex/creditPacks";
import { CREDIT_PACK_LIST } from "../../web/lib/payments/creditPacksCatalog";

describe("micro credit packs GH₵5/10/20", () => {
  it("lists starter, mini, and creator packs in the catalog", () => {
    const ids = CREDIT_PACK_LIST.map((p) => p.id);
    expect(ids).toContain("credits_5");
    expect(ids).toContain("credits_10");
    expect(ids).toContain("credits_20");
  });

  it("grants 1:1 credits after verified payment on the server", () => {
    expect(getCreditPack("credits_5")).toMatchObject({
      amountGhs: 5,
      credits: 5,
      type: "credits",
    });
    expect(getCreditPack("credits_10")).toMatchObject({
      amountGhs: 10,
      credits: 10,
    });
    expect(getCreditPack("credits_20")).toMatchObject({
      amountGhs: 20,
      credits: 20,
    });
  });

  it("preserves existing larger packs", () => {
    expect(getCreditPack("credits_60")?.amountGhs).toBe(60);
    expect(getCreditPack("credits_150")?.amountGhs).toBe(150);
    expect(getCreditPack("credits_500")?.amountGhs).toBe(500);
  });
});
