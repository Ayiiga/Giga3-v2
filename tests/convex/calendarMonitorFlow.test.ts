/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { encryptSecret } from "../../convex/connectors/crypto";
import schema from "../../convex/schema";
import { createSessionToken } from "../../convex/sessionAuth";

const modules = import.meta.glob("../../convex/**/*.*s");

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("creates a calendar monitor and records one reminder and one push dispatch across repeated checks", async () => {
  vi.useFakeTimers();
  vi.stubEnv("SESSION_SIGNING_SECRET", "calendar-monitor-test-session");
  vi.stubEnv("CONNECTOR_TOKEN_ENCRYPTION_KEY", "calendar-monitor-test-encryption");
  vi.stubEnv("GIGA3_PUSH_ALERTS_ENABLED", "true");

  const email = "calendar-test@example.com";
  const sessionToken = await createSessionToken(email);
  const accessTokenEnc = await encryptSecret("test-calendar-token");
  const now = Date.now();
  const start = new Date(now + 20 * 60_000).toISOString();
  const fetchGraph = vi.fn(async (url: URL, init: RequestInit) => {
    expect(url.origin).toBe("https://graph.microsoft.com");
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-calendar-token" });
    return Response.json({ value: [
      { id: "event-1", subject: "Private meeting title", start: { dateTime: start } },
      { id: "event-2", subject: "Cancelled meeting", isCancelled: true, start: { dateTime: start } },
    ] });
  });
  vi.stubGlobal("fetch", fetchGraph);

  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email, tokens: 0, plan: "free", tier: "free", credits: 0, starterCreditsGranted: true,
      subscriptionPlan: "premium", subscriptionExpiresAt: now + 24 * 60 * 60_000,
    });
    await ctx.db.insert("connectorConnections", {
      userId: email, provider: "outlook_calendar", status: "connected",
      scopes: ["Calendars.ReadWrite"], accessTokenEnc, connectedAt: now, updatedAt: now,
    });
  });
  const monitorId = await t.mutation(api.monitoring.create, {
    sessionToken, kind: "calendar", target: "Work", calendarId: "work-calendar", leadMinutes: 30,
  });

  await t.action(internal.monitoringWorker.run, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  await vi.advanceTimersByTimeAsync(60_000);
  await t.action(internal.monitoringWorker.run, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  expect(fetchGraph).toHaveBeenCalledTimes(2);
  expect(fetchGraph.mock.calls[0]?.[0].pathname).toBe("/v1.0/me/calendars/work-calendar/calendarView");
  const dashboard = await t.query(api.monitoring.dashboard, { sessionToken });
  expect(dashboard.alerts).toMatchObject([{ monitorId, title: "Private meeting title", eventAt: Date.parse(start) }]);
  const dispatches = await t.run((ctx) => ctx.db.query("pushNotificationDedup").collect());
  expect(dispatches).toMatchObject([{ userId: email, title: "Calendar reminder", body: "An Outlook event is coming up." }]);
});
