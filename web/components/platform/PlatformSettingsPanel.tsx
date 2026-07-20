"use client";

import { Button } from "@/components/ui/Button";
import { SettingsPanelSkeleton } from "@/components/platform/SettingsPanelSkeleton";
import { usePlatformProfileContext } from "@/components/platform/PlatformProfileProvider";
import { USER_ROLES, type UserRoleId } from "@/lib/vision";
import { useEffect, useState } from "react";

export function PlatformSettingsPanel() {
  const { isLoading, userRole, preferences, saveUserRole, updatePreferences } =
    usePlatformProfileContext();
  const [role, setRole] = useState<UserRoleId>(userRole);
  const [writingStyle, setWritingStyle] = useState(preferences.preferredWritingStyle);
  const [language, setLanguage] = useState(preferences.preferredLanguage);
  const [notifications, setNotifications] = useState(preferences.notificationsEnabled);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    Boolean(preferences.quietHoursEnabled)
  );
  const [quietHoursStart, setQuietHoursStart] = useState(preferences.quietHoursStart ?? "22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState(preferences.quietHoursEnd ?? "07:00");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRole(userRole);
    setWritingStyle(preferences.preferredWritingStyle);
    setLanguage(preferences.preferredLanguage);
    setNotifications(preferences.notificationsEnabled);
    setQuietHoursEnabled(Boolean(preferences.quietHoursEnabled));
    setQuietHoursStart(preferences.quietHoursStart ?? "22:00");
    setQuietHoursEnd(preferences.quietHoursEnd ?? "07:00");
  }, [userRole, preferences]);

  if (isLoading) {
    return <SettingsPanelSkeleton title="settings" />;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const roleResult = role !== userRole ? await saveUserRole(role) : { ok: true as const };
    if (!roleResult.ok) {
      setError(roleResult.error);
      setBusy(false);
      return;
    }

    const prefsResult = await updatePreferences({
      preferredWritingStyle: writingStyle,
      preferredLanguage: language,
      notificationsEnabled: notifications,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
    });

    setBusy(false);
    if (prefsResult.ok) {
      setMessage("Settings saved.");
    } else {
      setError(prefsResult.error);
    }
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className="settings-panel-card saas-card space-y-4 rounded-2xl p-5">
      <div>
        <h3 className="font-semibold">Profile &amp; settings</h3>
        <p className="mt-1 text-sm text-muted">
          Update your role and preferences. Changes apply across Giga3.
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-foreground">Your role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRoleId)}
          className="input-surface mt-1.5 w-full"
          disabled={busy}
        >
          {USER_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-foreground">Writing style</span>
        <select
          value={writingStyle}
          onChange={(e) => setWritingStyle(e.target.value)}
          className="input-surface mt-1.5 w-full"
          disabled={busy}
        >
          <option value="balanced">Balanced</option>
          <option value="concise">Concise</option>
          <option value="detailed">Detailed</option>
          <option value="friendly">Friendly</option>
          <option value="professional">Professional</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-foreground">Preferred language</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="input-surface mt-1.5 w-full"
          disabled={busy}
        >
          <option value="en">English</option>
          <option value="fr">French</option>
          <option value="tw">Twi</option>
          <option value="ha">Hausa</option>
          <option value="sw">Swahili</option>
        </select>
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
        <span className="font-medium">In-app notifications</span>
        <input
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
          disabled={busy}
          className="h-4 w-4 accent-accent"
        />
      </label>

      <div className="space-y-3 rounded-xl border border-border p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
          <span className="font-medium">Quiet hours</span>
          <input
            type="checkbox"
            checked={quietHoursEnabled}
            onChange={(e) => setQuietHoursEnabled(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-accent"
          />
        </label>
        {quietHoursEnabled ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted">Start</span>
              <input
                type="time"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(e.target.value)}
                disabled={busy}
                className="input-surface mt-1 w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">End</span>
              <input
                type="time"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(e.target.value)}
                disabled={busy}
                className="input-surface mt-1 w-full"
              />
            </label>
          </div>
        ) : null}
        <p className="text-xs text-muted">
          Push notifications are paused during quiet hours on this account.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
        {message && (
          <p className="text-sm text-emerald-700" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
