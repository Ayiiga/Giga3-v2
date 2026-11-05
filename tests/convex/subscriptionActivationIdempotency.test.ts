/**
 * @vitest-environment edge-runtime
 * Replaying a Paystack event must not create a second paid subscription period.
 */
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.*s");

describe("subscription activation idempotency", () => {
  it("returns the existing period for a repeated Paystack reference", async () => {
    const t = convexTest(schema, modules);
    const userId = "subscription-replay@example.com";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: userId, tokens: 0, plan: "free", tier: "free",
        subscriptionPlan: "free", credits: 25, starterCreditsGranted: true,
      });
    });
    const args = {
      userId, planId: "pro" as const, paystackReference: "paystack-repeat-001",
      creditsToGrant: 250, source: "checkout" as const,
    };
    const first = await t.mutation(internal.subscriptions.activateSubscription, args);
    const replay = await t.mutation(internal.subscriptions.activateSubscription, args);
    expect(replay.subscriptionId).toBe(first.subscriptionId);
    expect(replay.periodEnd).toBe(first.periodEnd);
    const state = await t.run(async (ctx) => ({
      subscriptions: await ctx.db.query("subscriptions")
        .withIndex("by_reference", (q) => q.eq("paystackReference", args.paystackReference)).collect(),
      user: await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", userId)).first(),
    }));
    expect(state.subscriptions).toHaveLength(1);
    expect(state.user?.subscriptionExpiresAt).toBe(first.periodEnd);
  });

  it("rejects a reference reused by another account", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (const email of ["owner-sub@example.com", "other-sub@example.com"]) {
        await ctx.db.insert("users", {
          email, tokens: 0, plan: "free", tier: "free",
          subscriptionPlan: "free", credits: 0, starterCreditsGranted: true,
        });
      }
    });
    await t.mutation(internal.subscriptions.activateSubscription, {
      userId: "owner-sub@example.com", planId: "pro",
      paystackReference: "shared-sub-reference", creditsToGrant: 250,
    });
    await expect(t.mutation(internal.subscriptions.activateSubscription, {
      userId: "other-sub@example.com", planId: "pro",
      paystackReference: "shared-sub-reference", creditsToGrant: 250,
    })).rejects.toThrow("Subscription payment reference already belongs to another operation");
  });
});
