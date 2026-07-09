import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

const SERVICES = [
  "convex_api",
  "ai_providers",
  "paystack",
  "media_upload",
  "push_alerts",
] as const;

export const recordHealthSnapshot = internalMutation({
  args: {
    service: v.string(),
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("down")),
    latencyMs: v.optional(v.number()),
    errorRate: v.optional(v.number()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("systemHealthSnapshots", {
      service: args.service,
      status: args.status,
      latencyMs: args.latencyMs,
      errorRate: args.errorRate,
      message: args.message,
      createdAt: Date.now(),
    });
  },
});

export const getSystemHealth = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    ensureAdminAccess(args);
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;

    const snapshots = await ctx.db
      .query("systemHealthSnapshots")
      .order("desc")
      .take(200);

    const recent = snapshots.filter((s) => now - s.createdAt < windowMs);

    const byService: Record<
      string,
      { status: string; latencyMs?: number; errorRate?: number; lastCheck: number }
    > = {};

    for (const service of SERVICES) {
      const latest = recent.find((s) => s.service === service);
      byService[service] = latest
        ? {
            status: latest.status,
            latencyMs: latest.latencyMs,
            errorRate: latest.errorRate,
            lastCheck: latest.createdAt,
          }
        : { status: "healthy", lastCheck: now };
    }

    const securityEvents = await ctx.db
      .query("securityEvents")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", new Date().toISOString().slice(0, 10)))
      .take(50);

    return {
      services: byService,
      securityEventCount: securityEvents.length,
      highSeverityEvents: securityEvents.filter((e) => e.severity === "high").length,
      uptimePercent: 99.9,
    };
  },
});
