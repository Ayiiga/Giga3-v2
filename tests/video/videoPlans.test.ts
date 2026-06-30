import { describe, expect, it } from "vitest";
import { getVideoCreditPack, getVideoSubscription, listVideoCatalog } from "../../convex/videoPlans";

describe("videoPlans", () => {
  it("lists subscriptions and packs in $10–$100 range", () => {
    const catalog = listVideoCatalog();
    expect(catalog.subscriptions.length).toBe(3);
    expect(catalog.packs.length).toBe(4);
    expect(catalog.packs[0].usdPrice).toBe(10);
    expect(catalog.packs.at(-1)?.usdPrice).toBe(100);
  });

  it("resolves video subscription products", () => {
    const sub = getVideoSubscription("video_sub_creator");
    expect(sub?.type).toBe("video_subscription");
    expect(sub?.videoCredits).toBeGreaterThan(0);
  });

  it("resolves video credit packs", () => {
    const pack = getVideoCreditPack("video_pack_100");
    expect(pack?.type).toBe("video_credits");
    expect(pack?.videoCredits).toBe(500);
  });
});
