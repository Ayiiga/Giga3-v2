"use client";

import type { Doc } from "convex/_generated/dataModel";
import { api } from "convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSessionToken } from "@/lib/auth";
import { MONITORING_PLANS } from "../../../convex/monitoringPlans";

export function MonitoringPanel() {
  const sessionToken = getSessionToken();
  const data: {
    plan: string | null;
    expiresAt: number | null;
    monitors: Array<Doc<"monitors"> & { active: boolean }>;
    alerts: Doc<"monitorAlerts">[];
  } | undefined = useQuery(api.monitoring.dashboard, sessionToken ? { sessionToken } : "skip");
  const create = useMutation(api.monitoring.create);
  const remove = useMutation(api.monitoring.remove);
  const listCalendars = useAction(api.monitoringWorker.listCalendars);
  const [calendars, setCalendars] = useState<Array<{ id: string; name: string }>>([]);
  const [calendarId, setCalendarId] = useState("");
  const [kind, setKind] = useState<"website" | "calendar">("website");
  const [target, setTarget] = useState("");
  const [leadMinutes, setLeadMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Monitoring action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!sessionToken) return <p><Link href="/chat/login?next=/automation/">Sign in</Link> to manage monitors.</p>;
  if (!data) return <p>Loading monitors…</p>;
  const plan = MONITORING_PLANS.find((item) => item.id === data.plan);
  const used = data.monitors.filter((monitor) => monitor.active).length;
  const monitorKind = plan?.calendars ? kind : "website";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Monitoring &amp; reminders</h2>
        <p className="text-muted">Website text is checked hourly. Outlook reminders appear here and as push alerts when enabled.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {MONITORING_PLANS.map((item) => (
          <article key={item.id} className="space-y-3 rounded-xl border p-4">
            <h3 className="font-semibold">{item.label}</h3>
            <p>GH₵{item.priceGhs}/month</p>
            <p className="text-sm text-muted">{item.calendars ? "Mix website and Outlook Calendar monitors." : "Track changes on one public website."}</p>
            {plan?.id === item.id ? <p>Current plan</p> : <Link className="underline" href="/subscribe/">View subscriptions</Link>}
          </article>
        ))}
      </div>
      {plan && (
        <form className="space-y-3 rounded-xl border p-4" onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const calendar = calendars.find((item) => item.id === calendarId);
            await create({
              sessionToken, kind: monitorKind,
              target: monitorKind === "calendar" ? calendar?.name ?? "" : target,
              calendarId: monitorKind === "calendar" ? calendar?.id : undefined,
              leadMinutes: monitorKind === "calendar" ? leadMinutes : undefined,
            });
            setTarget("");
          });
        }}>
          <p>{used} of {plan.slots} active · Access ends {new Date(data.expiresAt!).toLocaleDateString()}</p>
          {plan.calendars && (
            <label className="block">Monitor type{" "}
              <select value={monitorKind} onChange={(event) => setKind(event.target.value === "calendar" ? "calendar" : "website")}>
                <option value="website">Website</option><option value="calendar">Outlook Calendar</option>
              </select>
            </label>
          )}
          {monitorKind === "website" ? (
            <label className="block">Public HTTPS page
              <input required type="url" className="mt-1 block w-full rounded-lg border p-2" value={target}
                placeholder="https://example.com/pricing" onChange={(event) => setTarget(event.target.value)} />
            </label>
          ) : (
            <div>
              <Link href="/automation/?tab=integrations" className="underline">Connect Outlook Calendar</Link>
              <Button type="button" disabled={busy} onClick={() => void run(async () => {
                const options = await listCalendars({ sessionToken });
                setCalendars(options);
                setCalendarId(options[0]?.id ?? "");
              })}>Load calendars</Button>
              <label className="block">Calendar{" "}
                <select required value={calendarId} onChange={(event) => setCalendarId(event.target.value)}>
                  <option value="">Choose a calendar</option>
                  {calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}
                </select>
              </label>
              <label className="block">Remind me before each event{" "}
                <select value={leadMinutes} onChange={(event) => setLeadMinutes(Number(event.target.value))}>
                  <option value={15}>15 minutes</option><option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option><option value={1440}>1 day</option>
                </select>
              </label>
            </div>
          )}
          <Button type="submit" disabled={busy || used >= plan.slots}>Add monitor</Button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="space-y-3">
        <h3 className="font-semibold">Your monitors</h3>
        {data.monitors.length === 0 && <p className="text-muted">No monitors yet.</p>}
        {data.monitors.map((monitor) => (
          <article key={monitor._id} className="space-y-2 rounded-xl border p-4">
            <p className="break-all font-medium">{monitor.target}</p>
            <p className="text-sm text-muted">{monitor.active ? "Active" : "Paused"}
              {monitor.active && ` · Next check ${new Date(monitor.nextCheckAt).toLocaleString()}`}
              {monitor.lastCheckAt && ` · Last checked ${new Date(monitor.lastCheckAt).toLocaleString()}`}
            </p>
            {monitor.lastError && <p>{monitor.lastError}</p>}
            <Button type="button" disabled={busy} onClick={() => void run(() => remove({ sessionToken, monitorId: monitor._id }))}>Remove</Button>
          </article>
        ))}
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Recent alerts</h3>
        {data.alerts.length === 0 && <p className="text-muted">No alerts yet.</p>}
        {data.alerts.map((alert) => <p key={alert._id}>{alert.title} · {new Date(alert.eventAt ?? alert.createdAt).toLocaleString()}</p>)}
      </div>
    </section>
  );
}
