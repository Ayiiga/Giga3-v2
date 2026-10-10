"use client";

import {
  BLOG_PUSH_DISMISS_KEY,
  BLOG_PUSH_MUTE_KEY,
  isBlogPushEnabled,
} from "@/lib/blog/blogPushConfig";
import {
  getBlogPushPermission,
  isBlogPushOptedIn,
  isBlogPushSupported,
  subscribeBlogPush,
  unsubscribeBlogPush,
} from "@/lib/blog/onesignalClient";
import { Bell, BellOff, X } from "lucide-react";
import { useEffect, useState } from "react";

type Status =
  | "hidden"
  | "prompt"
  | "unsupported"
  | "denied"
  | "subscribed"
  | "busy"
  | "error";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    if (value) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Soft opt-in for Giga3 AI blog article notifications (OneSignal).
 * Never auto-triggers the browser permission dialog.
 * Renders nothing when the feature flag / App ID is not configured.
 */
export function BlogPushSubscribe({
  variant = "card",
}: {
  variant?: "card" | "compact";
}) {
  const [status, setStatus] = useState<Status>("hidden");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isBlogPushEnabled()) {
      setStatus("hidden");
      return;
    }
    if (!isBlogPushSupported()) {
      setStatus("unsupported");
      return;
    }

    const permission = getBlogPushPermission();
    if (permission === "denied") {
      setStatus("denied");
      return;
    }

    let cancelled = false;
    void (async () => {
      const optedIn = permission === "granted" ? await isBlogPushOptedIn() : false;
      if (cancelled) return;
      if (optedIn) {
        setStatus("subscribed");
        return;
      }
      if (readFlag(BLOG_PUSH_MUTE_KEY) || readFlag(BLOG_PUSH_DISMISS_KEY)) {
        setStatus("hidden");
        return;
      }
      setStatus("prompt");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "hidden") return null;

  async function onEnable() {
    setStatus("busy");
    setMessage(null);
    const result = await subscribeBlogPush();
    if (result.ok) {
      writeFlag(BLOG_PUSH_DISMISS_KEY, false);
      setStatus("subscribed");
      setMessage("You are subscribed to new Giga3 AI blog articles.");
      return;
    }
    if (result.permission === "denied") {
      setStatus("denied");
      setMessage("Notifications are blocked in your browser settings.");
      return;
    }
    if (result.permission === "unsupported" || result.error === "unsupported") {
      setStatus("unsupported");
      return;
    }
    setStatus("prompt");
    setMessage("Could not subscribe right now. Please try again later.");
  }

  function onDismiss() {
    writeFlag(BLOG_PUSH_DISMISS_KEY, true);
    setStatus("hidden");
  }

  function onMute() {
    writeFlag(BLOG_PUSH_MUTE_KEY, true);
    writeFlag(BLOG_PUSH_DISMISS_KEY, true);
    setStatus("hidden");
  }

  async function onUnsubscribe() {
    setStatus("busy");
    const result = await unsubscribeBlogPush();
    if (result.ok) {
      setStatus("prompt");
      setMessage("You unsubscribed from blog notifications on this device.");
      return;
    }
    setStatus("subscribed");
    setMessage("Could not unsubscribe right now. Try again or use browser site settings.");
  }

  const shell =
    variant === "compact"
      ? "rounded-xl border border-violet-200 bg-violet-50/70 p-4"
      : "rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm";

  return (
    <aside className={shell} aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 text-violet-700">
          {status === "subscribed" ? (
            <Bell className="h-5 w-5" aria-hidden />
          ) : (
            <BellOff className="h-5 w-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">
            {status === "subscribed"
              ? "Blog notifications on"
              : "Get notified about new Giga3 AI articles"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {status === "unsupported"
              ? "Web push is not available in this browser or private window. You can still follow the blog on this site."
              : status === "denied"
                ? "Browser notifications are blocked. Enable them for www.giga3ai.com in your browser settings if you want article alerts."
                : status === "subscribed"
                  ? "We may send occasional alerts when a new editorial article is published — at most about one per day."
                  : "Opt in to receive occasional notifications when Giga3 AI publishes a new blog guide. You can unsubscribe anytime."}
          </p>

          {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {status === "prompt" || status === "error" ? (
              <>
                <button
                  type="button"
                  onClick={() => void onEnable()}
                  className="inline-flex min-h-10 items-center rounded-full bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800"
                >
                  Notify me
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-violet-300"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={onMute}
                  className="inline-flex min-h-10 items-center px-2 text-xs font-medium text-slate-500 underline-offset-2 hover:underline"
                >
                  Don&apos;t ask again
                </button>
              </>
            ) : null}

            {status === "subscribed" ? (
              <button
                type="button"
                onClick={() => void onUnsubscribe()}
                className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-violet-300"
              >
                Unsubscribe
              </button>
            ) : null}

            {status === "busy" ? (
              <span className="inline-flex min-h-10 items-center text-sm text-slate-500">
                Working…
              </span>
            ) : null}
          </div>
        </div>

        {status === "prompt" || status === "error" ? (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-100"
            aria-label="Dismiss blog notification prompt"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </aside>
  );
}
