"use client";

import {
  getNotificationPrefs,
  NOTIFICATION_LABELS,
  saveNotificationPrefs,
} from "@/lib/automation/notifications";
import type { AutomationNotificationKey } from "@/lib/automation/types";
import { Bell } from "lucide-react";
import { useState } from "react";

export function AutomationNotificationsPanel() {
  const [prefs, setPrefs] = useState(getNotificationPrefs);

  function toggle(key: AutomationNotificationKey) {
    const next = saveNotificationPrefs({ [key]: !prefs[key] });
    setPrefs(next);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Bell className="h-4 w-4" aria-hidden />
        Automation reminders
      </h2>
      <p className="text-sm text-muted">
        Configure intelligent reminders. In-app toasts use the generation coordinator;
        push alerts respect your existing PWA settings.
      </p>
      <ul className="space-y-3">
        {(Object.keys(NOTIFICATION_LABELS) as AutomationNotificationKey[]).map(
          (key) => {
            const meta = NOTIFICATION_LABELS[key];
            return (
              <li
                key={key}
                className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted">{meta.description}</p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={() => toggle(key)}
                    className="h-4 w-4 rounded border-border"
                  />
                  On
                </label>
              </li>
            );
          }
        )}
      </ul>
    </div>
  );
}
