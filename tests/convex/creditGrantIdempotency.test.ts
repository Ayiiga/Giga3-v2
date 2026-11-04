/**
 * @vitest-environment edge-runtime
 * Regression coverage for payment-reference credit grant replay protection.
 */
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.*s");

describe("credit grant idempotency", () => {
  it("does not apply the same referenced purchase twice", async () => {
    const t = convexTest(schema, modules);
    const userId = "wallet-replay@example.com";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: userId, tokens: 0, plan: "free", tier: "free",
        subscriptionPlan: "free", credits: 25, starterCreditsGranted: true,
      });
    });
    const grant = {
      userId, credits: 100, action: "credit_purchase" as const,
      reference: "giga3_test_purchase_replay",
    };
    const first = await t.mutation(internal.credits.grantCreditsInternal, grant);
    const replay = await t.mutation(internal.credits.grantCreditsInternal, grant);
    expect(first).toBe(125);
    expect(replay).toBe(125);
    const state = await t.run(async (ctx) => {
      const user = await ctx.db.query("users")
        .withIndex("by_email", (q) => q.eq("email", userId)).first();
      const logs = await ctx.db.query("creditLogs")
        .withIndex("by_reference", (q) => q.eq("reference", grant.reference)).collect();
      return { balance: user?.credits, logs };
    });
    expect(state.balance).toBe(125);
    expect(state.logs).toHaveLength(1);
  });

  it("rejects reuse of a reference by another account or action", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (const email of ["owner@example.com", "other@example.com"]) {
        await ctx.db.insert("users", {
          email, tokens: 0, plan: "free", tier: "free",
          subscriptionPlan: "free", credits: 0, starterCreditsGranted: true,
        });
      }
    });
    await t.mutation(internal.credits.grantCreditsInternal, {
      userId: "owner@example.com", credits: 50, action: "credit_purchase",
      reference: "shared-reference",
    });
    await expect(t.mutation(internal.credits.grantCreditsInternal, {
      userId: "other@example.com", credits: 50, action: "credit_purchase",
      reference: "shared-reference",
    })).rejects.toThrow("Credit grant reference already belongs to another operation");
    await expect(t.mutation(internal.credits.grantCreditsInternal, {
      userId: "owner@example.com", credits: 50, action: "admin_grant",
      reference: "shared-reference",
    })).rejects.toThrow("Credit grant reference already belongs to another operation");
  });

  it("scopes starter grant references to each account", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (const email of ["first@example.com", "second@example.com"]) {
        await ctx.db.insert("users", {
          email, tokens: 0, plan: "free", tier: "free",
          subscriptionPlan: "free", credits: 0, starterCreditsGranted: false,
        });
      }
    });
    for (const email of ["first@example.com", "second@example.com"]) {
      await t.mutation(internal.credits.grantCreditsInternal, {
        userId: email, credits: 25, action: "starter_grant",
        reference: "signup:" + email, setBalance: true,
      });
    }
    const balances = await t.run(async (ctx) => Promise.all(
      ["first@example.com", "second@example.com"].map(async (email) =>
        (await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first())?.credits
      )
    ));
    expect(balances).toEqual([25, 25]);
  });
});
