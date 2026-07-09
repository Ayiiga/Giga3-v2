"use client";

import { saveA11yPrefs, getA11yPrefs } from "@/components/a11y/AccessibilityBootstrap";
import { usePlatformProfile } from "@/hooks/usePlatformProfile";
import { useState } from "react";

export function AccessibilitySettings() {
  const { preferences, updatePreferences } = usePlatformProfile();
  const [local, setLocal] = useState(() => ({
    ...getA11yPrefs(),
    largeText: preferences.largeText,
    reducedMotion: preferences.reducedMotion,
  }));

  function toggle(key: "largeText" | "reducedMotion") {
    const next = { ...local, [key]: !local[key] };
    setLocal(next);
    saveA11yPrefs({ largeText: next.largeText, reducedMotion: next.reducedMotion });
    void updatePreferences({ largeText: next.largeText, reducedMotion: next.reducedMotion });
  }

  return (
    <div className="saas-card space-y-3 rounded-2xl p-5">
      <h3 className="font-semibold">Accessibility</h3>
      <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
        <span>Large text</span>
        <input
          type="checkbox"
          checked={local.largeText}
          onChange={() => toggle("largeText")}
          className="h-4 w-4 accent-accent"
        />
      </label>
      <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={local.reducedMotion}
          onChange={() => toggle("reducedMotion")}
          className="h-4 w-4 accent-accent"
        />
      </label>
      <p className="text-xs text-muted">
        Supports screen readers, keyboard navigation, and responsive layouts across the platform.
      </p>
    </div>
  );
}
