import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

export const SECURITY_EVENT_TYPES = {
  AUTH_FAILURE: "auth_failure",
  AUTH_FORBIDDEN: "auth_forbidden",
  UPLOAD_ABUSE: "upload_abuse",
  RATE_LIMIT: "rate_limit",
  ATTACHMENT_REJECTED: "attachment_rejected",
  SUSPICIOUS_ACTIVITY: "suspicious_activity",
  SESSION_ROTATED: "session_rotated",
} as const;

export type SecurityEventType =
  (typeof SECURITY_EVENT_TYPES)[keyof typeof SECURITY_EVENT_TYPES];

const severityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
);

function hashIdentifier(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().toLowerCase().slice(0, 64);
}

export const recordSecurityEvent = internalMutation({
  args: {
    eventType: v.string(),
    severity: severityValidator,
    message: v.string(),
    email: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const createdAt = args.createdAt ?? Date.now();
    const dateKey = new Date(createdAt).toISOString().slice(0, 10);
    const emailHash = hashIdentifier(args.email);

    const id = await ctx.db.insert("securityEvents", {
      eventType: args.eventType,
      severity: args.severity,
      message: args.message.slice(0, 500),
      emailHash,
      metadata: args.metadata?.slice(0, 1000),
      dateKey,
      createdAt,
    });

    if (args.severity === "high") {
      console.warn("[security.alert]", {
        eventType: args.eventType,
        message: args.message,
        emailHash,
      });
    } else {
      console.info("[security.event]", {
        eventType: args.eventType,
        severity: args.severity,
        emailHash,
      });
    }

    return id;
  },
});

export const getSecurityDashboard = query({
  args: {
    ...adminCredentialArgs,
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const hours = Math.max(1, Math.min(168, args.hours ?? 24));
    const since = Date.now() - hours * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("securityEvents")
      .withIndex("by_createdAt")
      .order("desc")
      .take(500);

    const recent = rows.filter((row) => row.createdAt >= since);
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const row of recent) {
      byType[row.eventType] = (byType[row.eventType] ?? 0) + 1;
      bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + 1;
    }

    return {
      hours,
      total: recent.length,
      byType,
      bySeverity,
      recent: recent.slice(0, 50).map((row) => ({
        eventType: row.eventType,
        severity: row.severity,
        message: row.message,
        emailHash: row.emailHash,
        createdAt: row.createdAt,
      })),
    };
  },
});
