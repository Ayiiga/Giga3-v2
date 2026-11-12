import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireSession } from "./auth";
import { classifyBrowseUrl } from "./liveWeb/browsePolicy";
import { getMonitoringPlan } from "./monitoringPlans";

const kind = v.union(v.literal("website"), v.literal("calendar"));

async function getAccess(ctx: QueryCtx, userId: string) {
  const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", userId)).unique();
  const expiresAt = user?.subscriptionExpiresAt ?? null;
  return {
    expiresAt,
    plan: user && expiresAt && expiresAt > Date.now() ? getMonitoringPlan(user.subscriptionPlan) : undefined,
  };
}

async function listMonitors(ctx: QueryCtx, userId: string) {
  return await ctx.db.query("monitors").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
}

function eligible(monitors: Doc<"monitors">[], plan: ReturnType<typeof getMonitoringPlan>) {
  return plan ? monitors.filter((row) => row.enabled && (row.kind === "website" || plan.calendars))
    .slice(0, plan.slots) : [];
}

export const dashboard = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const { plan, expiresAt } = await getAccess(ctx, userId);
    const monitors = await listMonitors(ctx, userId);
    const active = new Set(eligible(monitors, plan).map((row) => row._id));
    const alerts = await ctx.db.query("monitorAlerts")
      .withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(30);
    return {
      plan: plan?.id ?? null,
      expiresAt,
      monitors: monitors.map((row) => ({ ...row, active: active.has(row._id) })),
      alerts,
    };
  },
});

export const create = mutation({
  args: { sessionToken: v.string(), kind, target: v.string(), calendarId: v.optional(v.string()), leadMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const { plan } = await getAccess(ctx, userId);
    if (!plan || (args.kind === "calendar" && !plan.calendars)) throw new Error("Choose an eligible monitoring plan.");
    const monitors = await listMonitors(ctx, userId);
    if (eligible(monitors, plan).length >= plan.slots || monitors.length >= 5) {
      throw new Error("Remove a monitor to free a slot.");
    }
    let target = "Outlook Calendar";
    let calendarId: string | undefined;
    if (args.kind === "website") {
      const url = classifyBrowseUrl(args.target);
      if (args.target.length > 2048 || !url.ok || url.url.protocol !== "https:" || url.url.port || url.url.search) {
        throw new Error("Enter a public HTTPS page URL without a custom port or query string.");
      }
      url.url.hash = "";
      target = url.url.href;
    } else {
      const connection = await ctx.db.query("connectorConnections")
        .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", "outlook_calendar")).unique();
      if (connection?.status !== "connected") throw new Error("Connect Outlook Calendar under Integrations.");
      if (!args.calendarId || !/^[a-zA-Z0-9_+=/-]{1,1024}$/.test(args.calendarId)) {
        throw new Error("Choose an Outlook calendar.");
      }
      calendarId = args.calendarId;
      target = args.target.trim().slice(0, 160) || target;
      if (!Number.isInteger(args.leadMinutes) || ![15, 30, 60, 1440].includes(args.leadMinutes!)) {
        throw new Error("Choose a reminder time.");
      }
    }
    if (monitors.some((row) => row.kind === args.kind && (calendarId ? row.calendarId === calendarId : row.target === target))) {
      throw new Error("This monitor already exists.");
    }
    return await ctx.db.insert("monitors", {
      userId, kind: args.kind, target, calendarId, enabled: true,
      nextCheckAt: Date.now(), leadMinutes: args.kind === "calendar" ? args.leadMinutes : undefined,
    });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), monitorId: v.id("monitors") },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const row = await ctx.db.get(args.monitorId);
    if (row?.userId !== userId) return;
    const alerts = await ctx.db.query("monitorAlerts").withIndex("by_monitor_key", (q) => q.eq("monitorId", row._id)).collect();
    for (const alert of alerts) await ctx.db.delete(alert._id);
    await ctx.db.delete(row._id);
  },
});

export const expireAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60_000;
    const alerts = await ctx.db.query("monitorAlerts")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoff)).take(1000);
    for (const alert of alerts) await ctx.db.delete(alert._id);

  },
});

export const due = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("monitors")
    .withIndex("by_due", (q) => q.eq("enabled", true).lte("nextCheckAt", Date.now())).take(40),
});

export const claim = internalMutation({
  args: { id: v.id("monitors") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    const now = Date.now();
    if (!row?.enabled || row.nextCheckAt > now) return null;
    const { plan } = await getAccess(ctx, row.userId);
    const allowed = eligible(await listMonitors(ctx, row.userId), plan).some((item) => item._id === id);
    const lease = now + (allowed && row.kind === "calendar" ? 1 : 60) * 60_000;
    await ctx.db.patch(id, { nextCheckAt: lease });
    return allowed ? { row, lease } : null;
  },
});

export const finish = internalMutation({
  args: {
    id: v.id("monitors"), lease: v.number(), digest: v.optional(v.string()), error: v.optional(v.string()),
    alerts: v.array(v.object({ key: v.string(), title: v.string(), eventAt: v.optional(v.number()) })),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || row.nextCheckAt !== args.lease) return;
    const { plan } = await getAccess(ctx, row.userId);
    if (!eligible(await listMonitors(ctx, row.userId), plan).some((item) => item._id === row._id)) return;
    const now = Date.now();
    await ctx.db.patch(row._id, { lastCheckAt: now, lastError: args.error, digest: args.digest ?? row.digest });
    for (const alert of args.alerts) {
      const existing = await ctx.db.query("monitorAlerts").withIndex("by_monitor_key", (q) =>
        q.eq("monitorId", row._id).eq("key", alert.key)).first();
      if (existing) continue;
      const alertId = await ctx.db.insert("monitorAlerts", {
        ...alert, monitorId: row._id, userId: row.userId, createdAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.pushNotificationDispatch.dispatchPushNotification, {
        recipientId: row.userId,
        category: "announcement",
        title: alert.eventAt ? "Calendar reminder" : "Website changed",
        body: alert.eventAt ? "An Outlook event is coming up." : alert.title,
        url: "/automation/?tab=monitoring",
        tag: `monitor-${alertId}`,
      });
    }
  },
});
