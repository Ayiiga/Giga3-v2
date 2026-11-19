/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { createSessionToken } from "../../convex/sessionAuth";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.*s");
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("discovery attribution", () => {
  it("preserves the original source and deduplicates retries while counting later days", async () => {
    const t = convexTest(schema, modules);
    const visit = { clientId: "discovery-browser-01", isPwa: false, discoverySource: "chatgpt" };
    await t.mutation(api.platformStats.heartbeat, visit);
    await t.mutation(api.platformStats.heartbeat, { ...visit, discoverySource: "google" });
    await t.mutation(api.platformStats.recordDiscoveryPracticeStart, { clientId: visit.clientId });
    await t.mutation(api.platformStats.recordDiscoveryPracticeStart, { clientId: visit.clientId });
    const rows = await t.run((ctx) => ctx.db.query("platformCounters").collect());
    const metrics = rows.filter((r) => r.key.startsWith("discovery.daily:"));
    expect(metrics.map((r) => [r.key.split(":").slice(2).join(":"), r.value])).toEqual([["chatgpt:visit", 1], ["chatgpt:practice_start", 1]]);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 86_400_000);
    await t.mutation(api.platformStats.heartbeat, visit);
    const later = await t.run((ctx) => ctx.db.query("platformCounters").collect());
    expect(later.filter((r) => r.key.startsWith("discovery.daily:") && r.key.endsWith(":visit"))).toHaveLength(2);
  });

  it("counts a new account only after valid authentication and keeps reporting private", async () => {
    vi.stubEnv("SESSION_SIGNING_SECRET", "discovery-test-secret");
    const t = convexTest(schema, modules);
    const visit = { clientId: "discovery-browser-02", isPwa: false, discoverySource: "bing" };
    await t.mutation(api.platformStats.heartbeat, visit);
    const email = "discovery@example.com";
    await t.run((ctx) => ctx.db.insert("users", { email, tokens: 0, plan: "free", tier: "free", subscriptionPlan: "free", credits: 25, starterCreditsGranted: true }));
    await t.mutation(api.platformStats.heartbeat, { ...visit, sessionToken: "invalid" });
    const sessionToken = await createSessionToken(email);
    await t.mutation(api.platformStats.heartbeat, { ...visit, sessionToken });
    await t.mutation(api.platformStats.heartbeat, { ...visit, sessionToken });
    const rows = await t.run((ctx) => ctx.db.query("platformCounters").collect());
    expect(rows.filter((r) => r.key.startsWith("discovery.daily:") && r.key.endsWith(":signup")).map((r) => r.value)).toEqual([1]);
    await expect(t.query(api.platformStats.getDiscoveryReport, {})).rejects.toThrow();
  });

  it("rejects unknown sources and expires browser attribution after thirty days", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.platformStats.heartbeat, { clientId: "discovery-invalid-01", isPwa: false, discoverySource: "email@example.com" });
    await t.run((ctx) => ctx.db.insert("platformCounters", { key: "discovery.source:discovery-expired-01", value: 4, updatedAt: Date.now() - 31 * 86_400_000 }));
    await t.mutation(api.platformStats.recordDiscoveryPracticeStart, { clientId: "discovery-expired-01" });
    const rows = await t.run((ctx) => ctx.db.query("platformCounters").collect());
    expect(rows.filter((r) => r.key.startsWith("discovery.daily:"))).toHaveLength(0);
  });
});
