/** @vitest-environment edge-runtime */
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { matchesSocialBoost, normalizeSocialWebsite } from "../../convex/socialBoostOptions";

const modules = import.meta.glob("../../convex/**/*.*s");

describe("GigaSocial boost targeting", () => {
  it("validates lead destinations and matches audience and country together", () => {
    expect(normalizeSocialWebsite(" https://example.com/offer ")).toBe("https://example.com/offer");
    for (const url of ["javascript:alert(1)", "http://example.com", "https://brand@example.com", "https://localhost"]) {
      expect(() => normalizeSocialWebsite(url)).toThrow("HTTPS");
    }
    const options = { audience: "followers", country: "GH" };
    expect(matchesSocialBoost(options, true, "GH")).toBe(true);
    expect(matchesSocialBoost(options, false, "GH")).toBe(false);
    expect(matchesSocialBoost(options, true, "NG")).toBe(false);
    expect(matchesSocialBoost(undefined, false, undefined)).toBe(true);
  });

  it("retains the paid campaign options and only displays the CTA to matching feeds", async () => {
    const t = convexTest(schema, modules);
    const postId = await t.run(async (ctx) => ctx.db.insert("socialPosts", {
      authorId: "creator@example.com", body: "My shop", postType: "text",
      likeCount: 0, commentCount: 0, shareCount: 0, createdAt: 100, updatedAt: 100,
    }));
    const args = {
      reference: "giga3_boost_targeting_test", creatorId: "creator@example.com", targetType: "post" as const,
      targetId: postId, budgetGhs: 50, durationDays: 7,
      options: { audience: "new_people" as const, country: "GH" as const, website: "https://example.com/offer" },
    };
    const activation = await t.mutation(internal.gigaSocialEconomy.activateBoostCampaignInternal, args);
    const retry = await t.mutation(internal.gigaSocialEconomy.activateBoostCampaignInternal, args);
    expect(retry).toMatchObject({ alreadyFulfilled: true, boostId: activation.boostId });
    const targeted = await t.query(api.gigaSocial.listFeed, { discoveryCountry: "GH", limit: 1 });
    expect(targeted.posts[0]).toMatchObject({ _id: postId, promotion: { website: args.options.website } });
    expect(targeted.nextCursor).toBe(100);
    const untargeted = await t.query(api.gigaSocial.listFeed, { discoveryCountry: "NG" });
    expect(untargeted.posts[0].promotion).toBeUndefined();
    const next = await t.query(api.gigaSocial.listFeed, { discoveryCountry: "GH", cursor: 100 });
    expect(next.posts).toEqual([]);
  });
});
