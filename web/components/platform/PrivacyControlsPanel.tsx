"use client";

import { usePlatformProfile } from "@/hooks/usePlatformProfile";
import { useState } from "react";

export function PrivacyControlsPanel() {
  const { preferences, updatePreferences } = usePlatformProfile();
  const [saving, setSaving] = useState(false);

  async function togglePrivacyShare() {
    setSaving(true);
    try {
      await updatePreferences({ privacyShareUsage: !preferences.privacyShareUsage });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="saas-card space-y-3 rounded-2xl p-5">
      <h3 className="font-semibold">Privacy & personalization</h3>
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
          checked={preferences.privacyShareUsage}
          disabled={saving}
          onChange={() => void togglePrivacyShare()}
          className="mt-1 h-4 w-4 accent-accent"
        />
      </label>
      <p className="text-xs text-muted">
        Interest profiles are built from chat history. Disable to stop new learning; existing data is retained until you contact support.
      </p>
    </div>
  );
}
