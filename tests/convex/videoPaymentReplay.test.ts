/**
 * @vitest-environment edge-runtime
 * Video wallet and subscription payment replay protection.
 */
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.*s");

describe("video payment replay protection", () => {
  it("does not grant a video credit pack twice", async () => {
    const t = convexTest(schema, modules);
    const userId = "video-wallet@example.com";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: userId, tokens: 0, plan: "free", tier: "free",
        subscriptionPlan: "free", credits: 25, videoCredits: 3,
        starterCreditsGranted: true,
      });
    });
    const args = {
      userId, credits: 40, action: "video_pack_purchase" as const,
      reference: "video-pack-replay-001",
    };
    const first = await t.mutation(internal.videoCredits.grantVideoCreditsInternal, args);
    const replay = await t.mutation(internal.videoCredits.grantVideoCreditsInternal, args);
    expect(first.balanceAfter).toBe(43);
    expect(replay.balanceAfter).toBe(43);
    expect(replay.alreadyGranted).toBe(true);
    const state = await t.run(async (ctx) => ({
      user: await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", userId)).first(),
      logs: await ctx.db.query("videoCreditLogs")
        .withIndex("by_reference", (q) => q.eq("reference", args.reference)).collect(),
    }));
    expect(state.user?.videoCredits).toBe(43);
    expect(state.logs).toHaveLength(1);
  });

  it("does not extend a video subscription twice for one Paystack reference", async () => {
    const t = convexTest(schema, modules);
    const userId = "video-subscription@example.com";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: userId, tokens: 0, plan: "free", tier: "free",
        subscriptionPlan: "free", credits: 25, videoCredits: 0,
        starterCreditsGranted: true,
      });
    });
    const args = {
      userId, planId: "video_pro", paystackReference: "video-sub-replay-001",
      videoCreditsToGrant: 100, periodMs: 30 * 24 * 60 * 60 * 1000,
    };
    const first = await t.mutation(internal.videoInternal.activateVideoSubscriptionInternal, args);
    const replay = await t.mutation(internal.videoInternal.activateVideoSubscriptionInternal, args);
    expect(replay.periodEnd).toBe(first.periodEnd);
    expect(replay.alreadyActivated).toBe(true);
    const state = await t.run(async (ctx) => ({
      subscriptions: await ctx.db.query("videoSubscriptions")
        .withIndex("by_reference", (q) => q.eq("paystackReference", args.paystackReference)).collect(),
      user: await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", userId)).first(),
    }));
    expect(state.subscriptions).toHaveLength(1);
    expect(state.user?.videoSubscriptionExpiresAt).toBe(first.periodEnd);
  });
});
