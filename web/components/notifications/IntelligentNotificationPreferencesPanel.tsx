"use client";

import { Button } from "@/components/ui/Button";
import { useIntelligentNotifications } from "@/hooks/useIntelligentNotifications";
import { NotificationService } from "@/lib/intelligentNotifications";
import type { IntelligentNotificationPreferences } from "@/lib/intelligentNotifications/types";
import { useState } from "react";

type ToggleKey = keyof Pick<
  IntelligentNotificationPreferences,
  "enabled" | "social" | "messages" | "studio" | "learning" | "creator" | "quietHoursEnabled" | "browserNotifications"
>;

const TOGGLES: { key: ToggleKey; label: string; hint: string }[] = [
  { key: "enabled", label: "Enable notifications", hint: "Master switch for local intelligent alerts" },
  { key: "social", label: "Social notifications", hint: "Reactions, comments, and community activity" },
  { key: "messages", label: "Chat notifications", hint: "Message and conversation reminders" },
  { key: "studio", label: "AI Studio notifications", hint: "Generation ready and create reminders" },
  { key: "learning", label: "Learning notifications", hint: "GigaLearn practice reminders" },
  { key: "creator", label: "Creator milestones", hint: "Post performance and creator wins" },
  { key: "quietHoursEnabled", label: "Quiet hours", hint: "Pause local alerts during set hours" },
  { key: "browserNotifications", label: "Browser notifications", hint: "Optional OS alerts when the tab is hidden" },
];

export function IntelligentNotificationPreferencesPanel({
  embedded = true,
}: {
  embedded?: boolean;
}) {
  const { prefs, updatePrefs } = useIntelligentNotifications();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setToggle(key: ToggleKey, value: boolean) {
    updatePrefs({ ...prefs, [key]: value });
    setStatus("Preferences saved on this device.");
  }

  async function enableBrowser() {
    setBusy(true);
    try {
      const permission = await NotificationService.requestBrowserPermission();
      if (permission !== "granted") {
        setStatus("Browser notification permission was not granted.");
        return;
      }
      updatePrefs({ ...prefs, browserNotifications: true });
      setStatus("Browser notifications enabled when the tab is hidden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={
        embedded
          ? "space-y-3 rounded-2xl border border-border bg-card/60 p-4"
          : "mx-auto max-w-lg space-y-3 p-6"
      }
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">Intelligent notification preferences</h3>
        <p className="mt-1 text-xs text-muted">
          Stored locally on this device. Controls badges, reminders, and optional browser alerts.
        </p>
      </div>

      <ul className="space-y-2">
        {TOGGLES.map((row) => (
          <li
            key={row.key}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/80 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{row.label}</p>
              <p className="text-xs text-muted">{row.hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[row.key]}
              aria-label={row.label}
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
                prefs[row.key] ? "bg-accent" : "bg-muted/60"
              }`}
              onClick={() => {
                if (row.key === "browserNotifications" && !prefs.browserNotifications) {
                  void enableBrowser();
                  return;
                }
                setToggle(row.key, !prefs[row.key]);
              }}
              disabled={busy && row.key === "browserNotifications"}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  prefs[row.key] ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      {prefs.quietHoursEnabled ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            Start
            <input
              type="time"
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              value={prefs.quietHoursStart}
              onChange={(e) =>
                updatePrefs({ ...prefs, quietHoursStart: e.target.value || "22:00" })
              }
            />
          </label>
          <label className="text-xs text-muted">
            End
            <input
              type="time"
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              value={prefs.quietHoursEnd}
              onChange={(e) =>
                updatePrefs({ ...prefs, quietHoursEnd: e.target.value || "07:00" })
              }
            />
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            NotificationService.markAllRead();
            setStatus("All local notifications marked read.");
          }}
        >
          Mark local read
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            NotificationService.clear();
            setStatus("Local notifications cleared.");
          }}
        >
          Clear local
        </Button>
      </div>

      {status ? <p className="text-xs text-muted">{status}</p> : null}
    </div>
  );
}
