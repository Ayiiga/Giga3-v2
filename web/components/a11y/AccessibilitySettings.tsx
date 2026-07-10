"use client";

import { saveA11yPrefs, getA11yPrefs } from "@/components/a11y/AccessibilityBootstrap";
import { usePlatformProfileContext } from "@/components/platform/PlatformProfileProvider";
import { SettingsPanelSkeleton } from "@/components/platform/SettingsPanelSkeleton";
import { useEffect, useState } from "react";

export function AccessibilitySettings() {
  const { isLoading, preferences, updatePreferences } = usePlatformProfileContext();
  const [largeText, setLargeText] = useState(preferences.largeText);
  const [reducedMotion, setReducedMotion] = useState(preferences.reducedMotion);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (saving) return;
    setLargeText(preferences.largeText);
    setReducedMotion(preferences.reducedMotion);
  }, [preferences.largeText, preferences.reducedMotion, saving]);

  async function toggle(key: "largeText" | "reducedMotion") {
    const nextLarge = key === "largeText" ? !largeText : largeText;
    const nextMotion = key === "reducedMotion" ? !reducedMotion : reducedMotion;
    setLargeText(nextLarge);
    setReducedMotion(nextMotion);
    setSaving(true);
    setMessage(null);
    const result = await updatePreferences({
      largeText: nextLarge,
      reducedMotion: nextMotion,
    });
    setSaving(false);
    if (result.ok) {
      saveA11yPrefs({ largeText: nextLarge, reducedMotion: nextMotion });
      setMessage("Accessibility preference saved.");
    } else {
      const fallback = getA11yPrefs();
      setLargeText(fallback.largeText);
      setReducedMotion(fallback.reducedMotion);
      saveA11yPrefs(fallback);
    }
  }

  if (isLoading) {
    return <SettingsPanelSkeleton title="accessibility settings" />;
  }

  return (
    <div className="settings-panel-card saas-card space-y-3 rounded-2xl p-5">
      <h3 className="font-semibold">Accessibility</h3>
      <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
        <span>Large text</span>
        <input
          type="checkbox"
          checked={largeText}
          disabled={saving}
          onChange={() => void toggle("largeText")}
          className="h-4 w-4 accent-accent"
        />
      </label>
      <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reducedMotion}
          disabled={saving}
          onChange={() => void toggle("reducedMotion")}
          className="h-4 w-4 accent-accent"
        />
      </label>
      {message && (
        <p className="text-xs text-emerald-700" role="status">
          {message}
        </p>
      )}
      <p className="text-xs text-muted">
        Supports screen readers, keyboard navigation, and responsive layouts across the platform.
      </p>
    </div>
  );
}
