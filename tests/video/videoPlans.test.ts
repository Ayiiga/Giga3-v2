import { describe, expect, it } from "vitest";
import { getVideoCreditPack, getVideoSubscription, listVideoCatalog } from "../../convex/videoPlans";

describe("videoPlans", () => {
  it("lists subscriptions and packs in $15–$300 range", () => {
    const catalog = listVideoCatalog();
    expect(catalog.subscriptions.length).toBe(3);
    expect(catalog.packs.length).toBe(4);
    expect(catalog.packs[0].usdPrice).toBe(15);
    expect(catalog.packs.at(-1)?.usdPrice).toBe(300);
    expect(catalog.subscriptions[0].usdPrice).toBe(15);
    expect(catalog.subscriptions.at(-1)?.usdPrice).toBe(300);
  });

  it("resolves video subscription products", () => {
    const sub = getVideoSubscription("video_sub_creator");
    expect(sub?.type).toBe("video_subscription");
    expect(sub?.usdPrice).toBe(15);
    expect(sub?.videoCredits).toBeGreaterThan(0);
  });

  it("resolves video credit packs", () => {
    const pack = getVideoCreditPack("video_pack_300");
    expect(pack?.type).toBe("video_credits");
    expect(pack?.usdPrice).toBe(300);
    expect(pack?.videoCredits).toBe(1200);
  });

  it("maps legacy pack product ids for backward compatibility", () => {
    const legacy = getVideoCreditPack("video_pack_100");
    expect(legacy?.usdPrice).toBe(300);
    expect(legacy?.productId).toBe("video_pack_300");
  });
});
