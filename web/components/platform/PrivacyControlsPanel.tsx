"use client";

import { usePlatformProfileContext } from "@/components/platform/PlatformProfileProvider";
import { SettingsPanelSkeleton } from "@/components/platform/SettingsPanelSkeleton";
import { useEffect, useState } from "react";

export function PrivacyControlsPanel() {
  const { isLoading, preferences, updatePreferences } = usePlatformProfileContext();
  const [privacyShare, setPrivacyShare] = useState(preferences.privacyShareUsage);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrivacyShare(preferences.privacyShareUsage);
  }, [preferences.privacyShareUsage]);

  async function togglePrivacyShare() {
    const next = !privacyShare;
    setPrivacyShare(next);
    setSaving(true);
    setMessage(null);
    setError(null);
    const result = await updatePreferences({ privacyShareUsage: next });
    setSaving(false);
    if (result.ok) {
      setMessage("Preference updated.");
    } else {
      setPrivacyShare(!next);
      setError(result.error);
    }
  }

  if (isLoading) {
    return <SettingsPanelSkeleton title="privacy settings" />;
  }

  return (
    <div className="settings-panel-card saas-card space-y-3 rounded-2xl p-5">
      <h3 className="font-semibold">Privacy &amp; personalization</h3>
      <p className="text-sm text-muted">
        Giga3 learns your preferences over time to improve recommendations. You control what is stored.
      </p>
      <label className="flex cursor-pointer items-start justify-between gap-4 text-sm">
        <div>
          <span className="font-medium">Share usage for personalization</span>
          <p className="text-xs text-muted">Favorite tools, interests, and writing style</p>
        </div>
        <input
          type="checkbox"
          checked={privacyShare}
          disabled={saving || isLoading}
          onChange={() => void togglePrivacyShare()}
          className="mt-1 h-4 w-4 accent-accent"
        />
      </label>
      {message && (
        <p className="text-xs text-emerald-700" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">
        Interest profiles are built from chat history. Disable to stop new learning; existing data is retained until you contact support.
      </p>
    </div>
  );
}
