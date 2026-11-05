/**
 * @vitest-environment edge-runtime
 * Paystack fulfillment remains retryable after a downstream grant fails.
 */
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.*s");

describe("Paystack payment recovery", () => {
  it("keeps a failed fulfilment retryable, then fulfils once after recovery", async () => {
    const t = convexTest(schema, modules);
    const reference = "paystack-recovery-credits-001";
    await t.run(async (ctx) => {
      await ctx.db.insert("payments", {
        userId: "late-user@example.com",
        provider: "paystack",
        reference,
        productId: "credits_100",
        type: "credits",
        amountGhs: 10,
        creditsGranted: 100,
        status: "pending",
        createdAt: Date.now(),
      });
    });
    const response = JSON.stringify({ status: "success", amount: 1000, currency: "GHS" });
    await expect(t.mutation(internal.paystack.fulfillPayment, {
      reference, paystackResponse: response,
    })).rejects.toThrow("User not found");

    const pending = await t.run(async (ctx) =>
      ctx.db.query("payments").withIndex("by_reference", (q) => q.eq("reference", reference)).first()
    );
    expect(pending?.status).toBe("pending");

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "late-user@example.com", tokens: 0, plan: "free", tier: "free",
        subscriptionPlan: "free", credits: 25, starterCreditsGranted: true,
      });
    });
    const fulfilled = await t.mutation(internal.paystack.fulfillPayment, {
      reference, paystackResponse: response,
    });
    expect(fulfilled.alreadyFulfilled).toBe(false);
    const replay = await t.mutation(internal.paystack.fulfillPayment, {
      reference, paystackResponse: response,
    });
    expect(replay.alreadyFulfilled).toBe(true);

    const state = await t.run(async (ctx) => ({
      payment: await ctx.db.query("payments")
        .withIndex("by_reference", (q) => q.eq("reference", reference)).first(),
      user: await ctx.db.query("users")
        .withIndex("by_email", (q) => q.eq("email", "late-user@example.com")).first(),
      logs: await ctx.db.query("creditLogs")
        .withIndex("by_reference", (q) => q.eq("reference", reference)).collect(),
    }));
    expect(state.payment?.status).toBe("success");
    expect(state.user?.credits).toBe(125);
    expect(state.logs).toHaveLength(1);
  });
});
