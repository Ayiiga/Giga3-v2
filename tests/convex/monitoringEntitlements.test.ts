/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.*s");

describe("monitoring entitlements", () => {
  it("claims five mixed monitors for Premium, one website for Basic, and none after expiry", async () => {
    const t = convexTest(schema, modules);
    const email = "monitor-test@example.com";
    const { user, ids } = await t.run(async (ctx) => {
      const user = await ctx.db.insert("users", {
        email, tokens: 0, plan: "free", tier: "free", credits: 0, starterCreditsGranted: true,
        subscriptionPlan: "premium", subscriptionExpiresAt: Date.now() + 60_000,
      });
      const ids = [];
      for (const index of [0, 1, 2, 3, 4]) {
        ids.push(await ctx.db.insert("monitors", {
          userId: email, kind: index < 2 ? "calendar" : "website",
          target: `Monitor ${index}`, nextCheckAt: 0, enabled: true,
        }));
      }
      return { user, ids };
    });
    for (const id of ids) expect(await t.mutation(internal.monitoring.claim, { id })).not.toBeNull();

    await t.run(async (ctx) => {
      await ctx.db.patch(user, { subscriptionPlan: "basic" });
      for (const id of ids) await ctx.db.patch(id, { nextCheckAt: 0 });
    });
    for (const [index, id] of ids.entries()) {
      const job = await t.mutation(internal.monitoring.claim, { id });
      expect(Boolean(job)).toBe(index === 2);
    }

    await t.run(async (ctx) => {
      await ctx.db.patch(user, { subscriptionExpiresAt: 1 });
      for (const id of ids) await ctx.db.patch(id, { nextCheckAt: 0 });
    });
    for (const id of ids) expect(await t.mutation(internal.monitoring.claim, { id })).toBeNull();
  });
});
