/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.*s");

describe("homepage growth analytics", () => {
  it("counts one homepage visit and one exam completion per attributed browser", async () => {
    const t = convexTest(schema, modules);
    const clientId = "test-browser-01";
    await t.mutation(api.platformStats.recordExamPracticeCompletion, { clientId });
    const visit = { clientId, isPwa: false, isHomepage: true };
    await t.mutation(api.platformStats.heartbeat, visit);
    await t.mutation(api.platformStats.heartbeat, visit);
    await t.mutation(api.platformStats.recordExamPracticeCompletion, { clientId });
    await t.mutation(api.platformStats.recordExamPracticeCompletion, { clientId });
    const totals = await t.run(async (ctx) =>
      (await ctx.db.query("platformCounters").collect())
        .filter(({ key }) => key.startsWith("growth_total_"))
        .map(({ key, value }) => [key, value])
    );
    expect(totals).toEqual([["growth_total_homepage", 1], ["growth_total_practice", 1]]);
  });

  it("counts only an attributed, confirmed paid subscription once per new account", async () => {
    const t = convexTest(schema, modules);
    const payments = await t.run(async (ctx) => {
      const now = Date.now();
      const email = "homepage-growth@example.com";
      const user = await ctx.db.insert("users", { email, tokens: 0, plan: "free", tier: "free", subscriptionPlan: "free", credits: 25, starterCreditsGranted: true });
      await ctx.db.insert("platformCounters", {
        key: `growth_signup_${user}`, value: now - 1000, updatedAt: now,
      });
      const base = {
        userId: email, provider: "paystack" as const, productId: "sub_basic_monthly",
        type: "subscription" as const, planId: "basic" as const, amountGhs: 60, createdAt: now,
      };
      return {
        pending: await ctx.db.insert("payments", { ...base, reference: "pending", status: "pending" }),
        renewal: await ctx.db.insert("payments", { ...base, reference: "renewal", status: "success", isRenewal: true }),
        paid: await ctx.db.insert("payments", { ...base, reference: "paid", status: "success" }),
      };
    });
    const count = () => t.run(async (ctx) => (await ctx.db.query("platformCounters")
      .withIndex("by_key", (q) => q.eq("key", "growth_total_paid")).first())?.value ?? 0);
    await t.mutation(internal.platformStats.recordHomepageSubscription, { paymentId: payments.pending });
    await t.mutation(internal.platformStats.recordHomepageSubscription, { paymentId: payments.renewal });
    expect(await count()).toBe(0);
    await t.mutation(internal.platformStats.recordHomepageSubscription, { paymentId: payments.paid });
    await t.mutation(internal.platformStats.recordHomepageSubscription, { paymentId: payments.paid });
    expect(await count()).toBe(1);
  });
});
