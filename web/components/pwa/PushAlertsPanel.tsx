"use client";

import { Button } from "@/components/ui/Button";
import { formatTimestampDateTime } from "@/lib/datetime";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushAlertsPanel({ embedded = true }: { embedded?: boolean }) {
  const pushConfig = useQuery(api.pushAlerts.getPushConfig);
  const savePushSubscription = useMutation(api.pushAlerts.savePushSubscription);
  const updatePushPreferences = useMutation(api.pushAlerts.updatePushPreferences);
  const sendTestPush = useAction(api.pushAlerts.sendTestPush);

  const [sessionToken] = useState(() => getSessionToken());
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [newsAlerts, setNewsAlerts] = useState(true);
  const [sportsAlerts, setSportsAlerts] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enabled = pushConfig?.enabled && pushConfig.vapidPublicKey;

  const registerPush = useCallback(async () => {
    if (!sessionToken || !enabled || !pushConfig?.vapidPublicKey) return;
    setError(null);
    setBusy(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push notifications are not supported in this browser.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission was denied.");
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushConfig.vapidPublicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Could not read push subscription.");
      }
      await savePushSubscription({
        sessionToken,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        newsAlerts,
        sportsAlerts,
      });
      setEndpoint(json.endpoint);
      setStatus(`Alerts enabled · ${formatTimestampDateTime(Date.now())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable push alerts.");
    } finally {
      setBusy(false);
    }
  }, [
    enabled,
    newsAlerts,
    pushConfig?.vapidPublicKey,
    savePushSubscription,
    sessionToken,
    sportsAlerts,
  ]);

  useEffect(() => {
    if (!enabled) return;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? null))
      .catch(() => undefined);
  }, [enabled]);

  async function savePreferences() {
    if (!sessionToken || !endpoint) return;
    setBusy(true);
    try {
      await updatePushPreferences({
        sessionToken,
        endpoint,
        newsAlerts,
        sportsAlerts,
      });
      setStatus("Alert preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setBusy(false);
    }
  }

  async function testAlert() {
    if (!sessionToken || !endpoint) return;
    setBusy(true);
    try {
      await sendTestPush({ sessionToken, endpoint });
      setStatus("Test notification sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!pushConfig) return null;

  return (
    <section className={embedded ? "px-3 py-4 sm:px-4" : "rounded-2xl border bg-card p-6"}>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-800">
        <Bell className="h-4 w-4" aria-hidden />
        Push alerts
      </div>
      <h2 className="text-base font-semibold">News &amp; sports notifications</h2>
      <p className="mt-2 text-sm text-muted">
        Get breaking headlines and live score alerts on supported devices.
      </p>

      {!enabled && (
        <p className="mt-3 text-sm text-muted">
          Push alerts are not configured on this deployment yet.
        </p>
      )}

      {enabled && !sessionToken && (
        <p className="mt-3 text-sm text-muted">Sign in to enable push alerts.</p>
      )}

      {enabled && sessionToken && (
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newsAlerts}
              onChange={(e) => setNewsAlerts(e.target.checked)}
            />
            Breaking news headlines
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sportsAlerts}
              onChange={(e) => setSportsAlerts(e.target.checked)}
            />
            Live sports scores
          </label>

          {!endpoint ? (
            <Button type="button" size="sm" onClick={() => void registerPush()} disabled={busy}>
              <Bell className="mr-2 h-4 w-4" aria-hidden />
              Enable push alerts
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => void savePreferences()} disabled={busy}>
                Save preferences
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => void testAlert()} disabled={busy}>
                Send test
              </Button>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <Bell className="h-3.5 w-3.5" aria-hidden />
                Subscribed
              </span>
            </div>
          )}

          {endpoint && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
              onClick={() => setEndpoint(null)}
            >
              <BellOff className="h-3.5 w-3.5" aria-hidden />
              Show as not subscribed (this device only)
            </button>
          )}
        </div>
      )}

      {status && <p className="mt-3 text-sm text-emerald-700">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
