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

type PushPrefs = {
  muteAll: boolean;
  newsAlerts: boolean;
  sportsAlerts: boolean;
  socialAlerts: boolean;
  commentAlerts: boolean;
  mentionAlerts: boolean;
  followAlerts: boolean;
  generationAlerts: boolean;
  announcementAlerts: boolean;
};

const DEFAULT_PREFS: PushPrefs = {
  muteAll: false,
  newsAlerts: true,
  sportsAlerts: true,
  socialAlerts: true,
  commentAlerts: true,
  mentionAlerts: true,
  followAlerts: true,
  generationAlerts: true,
  announcementAlerts: true,
};

export function PushAlertsPanel({ embedded = true }: { embedded?: boolean }) {
  const pushConfig = useQuery(api.pushAlerts.getPushConfig);
  const savePushSubscription = useMutation(api.pushAlerts.savePushSubscription);
  const updatePushPreferences = useMutation(api.pushAlerts.updatePushPreferences);
  const removePushSubscription = useMutation(api.pushAlerts.removePushSubscription);
  const sendTestPush = useAction(api.pushAlertsActions.sendTestPush);

  const [sessionToken] = useState(() => getSessionToken());
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PREFS);
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
        ...prefs,
      });
      setEndpoint(json.endpoint);
      setStatus(`Alerts enabled · ${formatTimestampDateTime(Date.now())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable push alerts.");
    } finally {
      setBusy(false);
    }
  }, [enabled, prefs, pushConfig?.vapidPublicKey, savePushSubscription, sessionToken]);

  useEffect(() => {
    if (!enabled) return;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? null))
      .catch(() => undefined);
  }, [enabled]);

  function updatePref<K extends keyof PushPrefs>(key: K, value: PushPrefs[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function savePreferences() {
    if (!sessionToken || !endpoint) return;
    setBusy(true);
    try {
      await updatePushPreferences({
        sessionToken,
        endpoint,
        ...prefs,
      });
      setStatus("Alert preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    if (!sessionToken || !endpoint) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await removePushSubscription({ sessionToken, endpoint });
      setEndpoint(null);
      setStatus("Push alerts disabled on this device.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unsubscribe.");
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

  const categoryDisabled = prefs.muteAll;

  return (
    <section
      className={embedded ? "px-3 py-4 sm:px-4" : "rounded-2xl border bg-card p-6"}
      aria-labelledby="push-alerts-heading"
    >
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-800">
        <Bell className="h-4 w-4" aria-hidden />
        Push alerts
      </div>
      <h2 id="push-alerts-heading" className="text-base font-semibold">
        Intelligent notifications
      </h2>
      <p className="mt-2 text-sm text-muted">
        Receive timely alerts for social activity, AI generation, news, and platform announcements.
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
          <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={prefs.muteAll}
              onChange={(e) => updatePref("muteAll", e.target.checked)}
              aria-describedby="mute-all-desc"
            />
            Mute all notifications
          </label>
          <p id="mute-all-desc" className="sr-only">
            Disables all push notification categories on this device
          </p>

          <fieldset className="space-y-2" disabled={categoryDisabled}>
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
              Categories
            </legend>
            {(
              [
                ["socialAlerts", "New posts & social activity"],
                ["commentAlerts", "Comments & replies"],
                ["mentionAlerts", "Mentions"],
                ["followAlerts", "New followers"],
                ["generationAlerts", "AI image & video complete"],
                ["newsAlerts", "Breaking news headlines"],
                ["sportsAlerts", "Live sports scores"],
                ["announcementAlerts", "Platform announcements"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={(e) => updatePref(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          {!endpoint ? (
            <Button type="button" size="sm" onClick={() => void registerPush()} disabled={busy}>
              <Bell className="mr-2 h-4 w-4" aria-hidden />
              Enable push alerts
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void savePreferences()}
                disabled={busy}
              >
                Save preferences
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void testAlert()}
                disabled={busy}
              >
                Send test
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void unsubscribe()}
                disabled={busy}
              >
                <BellOff className="mr-1 h-3.5 w-3.5" aria-hidden />
                Unsubscribe
              </Button>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <Bell className="h-3.5 w-3.5" aria-hidden />
                Subscribed
              </span>
            </div>
          )}
        </div>
      )}

      {status && (
        <p className="mt-3 text-sm text-emerald-700" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
