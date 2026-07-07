"use client";

import { Button } from "@/components/ui/Button";
import {
  readGenerationBrowserNotifyEnabled,
  readGenerationSoundEnabled,
  writeGenerationBrowserNotifyEnabled,
  writeGenerationSoundEnabled,
} from "@/lib/generation/preferences";
import { requestGenerationBrowserPermission } from "@/lib/generation/browserNotify";
import { Bell, Volume2, VolumeX } from "lucide-react";
import { useCallback, useState } from "react";

export function GenerationAlertsPanel({ embedded = true }: { embedded?: boolean }) {
  const [soundOn, setSoundOn] = useState(() => readGenerationSoundEnabled());
  const [browserOn, setBrowserOn] = useState(() => readGenerationBrowserNotifyEnabled());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    writeGenerationSoundEnabled(next);
    setStatus(next ? "Completion sound enabled." : "Completion sound disabled.");
  }, [soundOn]);

  const toggleBrowser = useCallback(async () => {
    setError(null);
    if (browserOn) {
      setBrowserOn(false);
      writeGenerationBrowserNotifyEnabled(false);
      setStatus("Background browser alerts disabled.");
      return;
    }
    setBusy(true);
    try {
      const permission = await requestGenerationBrowserPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission was denied.");
      }
      setBrowserOn(true);
      writeGenerationBrowserNotifyEnabled(true);
      setStatus("Background alerts enabled when a tab is hidden.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable browser alerts.");
    } finally {
      setBusy(false);
    }
  }, [browserOn]);

  return (
    <div
      className={
        embedded
          ? "space-y-4 rounded-2xl border border-border bg-card/60 p-4"
          : "mx-auto max-w-lg space-y-4 p-6"
      }
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">AI completion alerts</h3>
        <p className="mt-1 text-xs text-muted">
          Toast notifications appear in-app. Enable optional sound and browser alerts for when you
          switch tabs during generation.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={toggleSound}
          className="gap-2"
        >
          {soundOn ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
          {soundOn ? "Sound on" : "Sound off"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void toggleBrowser()}
          disabled={busy}
          className="gap-2"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {browserOn ? "Background alerts on" : "Enable background alerts"}
        </Button>
      </div>

      {status ? <p className="text-xs text-emerald-700 dark:text-emerald-300">{status}</p> : null}
      {error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
