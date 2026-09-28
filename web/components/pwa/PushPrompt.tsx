"use client";

import { Button } from "@/components/ui/Button";
import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

const MUTE_KEY = "giga3:notif:mute";
const DISMISS_KEY = "giga3:notif:prompt:dismissed";

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Gentle push permission prompt on app open (respects mute + prior dismiss). */
export function PushPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (readMuted() || readDismissed()) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  async function enable() {
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        localStorage.setItem("giga3:notif:lastSeen", String(Date.now()));
      }
    } catch {
      /* ignore */
    } finally {
      setVisible(false);
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  function mute() {
    try {
      localStorage.setItem(MUTE_KEY, "1");
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(var(--primary-nav-offset,0px)+0.75rem)] z-[60] mx-auto max-w-md rounded-2xl border border-violet-500/25 bg-card p-4 shadow-lg sm:inset-x-auto sm:right-4"
      role="dialog"
      aria-labelledby="push-prompt-title"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600">
          <Bell className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p id="push-prompt-title" className="text-sm font-semibold text-foreground">
            Enable notifications
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Get alerts for new messages, GigaLearn reminders, and when your media is ready.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void enable()}>
              Enable
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
            <button
              type="button"
              onClick={mute}
              className="text-xs text-muted underline-offset-2 hover:underline"
            >
              Mute all
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-accent/10"
          aria-label="Dismiss notification prompt"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
