"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { branding } from "@/lib/branding";
import {
  dismissInstallPrompt,
  isInstallPromptDismissed,
} from "@/lib/pwa/installPromptStorage";
import { isIOSSafariLike } from "@/lib/pwa/pwaPlatform";
import { cn } from "@/lib/utils";
import {
  Check,
  Download,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

const SHOW_DELAY_MS = 1500;

const IOS_STEPS = [
  {
    icon: Share,
    title: "Tap Share",
    detail: "Open the share menu in Safari's toolbar.",
    pulse: true,
  },
  {
    icon: PlusSquare,
    title: "Add to Home Screen",
    detail: "Scroll the share sheet and choose this option.",
    pulse: false,
  },
  {
    icon: Check,
    title: "Tap Add",
    detail: "Confirm to place Giga3 on your home screen.",
    pulse: false,
  },
] as const;

export const InstallPrompt = memo(function InstallPrompt() {
  const pathname = usePathname();
  const { install, canInstall, isInstalled, isIOS } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);
  const [delayReady, setDelayReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  const isIosGuide = isIOS && isIOSSafariLike();
  const isAndroidNative = canInstall && !isIOS;

  useEffect(() => {
    setDismissed(isInstallPromptDismissed());
    const timer = window.setTimeout(() => setDelayReady(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const shouldShow = useMemo(() => {
    if (!delayReady || dismissed || isInstalled) return false;
    if (pathname === "/install" || pathname === "/install/") return false;
    if (isIosGuide) return true;
    if (isAndroidNative) return true;
    return false;
  }, [delayReady, dismissed, isAndroidNative, isInstalled, isIosGuide, pathname]);

  useEffect(() => {
    if (!shouldShow) {
      setVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [shouldShow]);

  const handleDismiss = useCallback(() => {
    dismissInstallPrompt();
    setDismissed(true);
    setVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    try {
      const accepted = await install();
      if (accepted) {
        setVisible(false);
        return;
      }
    } finally {
      setInstalling(false);
    }
  }, [install]);

  if (!shouldShow) return null;

  if (isIosGuide) {
    return (
      <div className="install-prompt-root" role="dialog" aria-labelledby="install-prompt-title">
        <button
          type="button"
          className="install-prompt-backdrop"
          aria-label="Dismiss install instructions"
          onClick={handleDismiss}
        />
        <div
          className={cn(
            "install-prompt-sheet",
            visible && "install-prompt-sheet--visible"
          )}
        >
          <div className="install-prompt-handle" aria-hidden />
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/15">
              <BrandLogo size={40} className="shadow-none ring-0" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id="install-prompt-title" className="text-base font-semibold text-foreground">
                Install {branding.name}
              </h2>
              <p className="mt-1 text-sm leading-snug text-muted">
                Add Giga3 to your home screen for a fast, app-like experience.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded-lg p-2 text-muted hover:bg-accent/10"
              aria-label="Close install instructions"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <ol className="mt-5 space-y-3" aria-label="How to install on iPhone">
            {IOS_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "install-prompt-step-icon",
                      step.pulse && "install-prompt-step-icon--pulse"
                    )}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-foreground">
                      <span className="mr-1.5 text-xs font-semibold text-accent">
                        {index + 1}.
                      </span>
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-muted">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 flex items-center gap-2 rounded-xl border border-accent/15 bg-accent/5 px-3 py-2.5 text-xs text-muted">
            <Smartphone className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            <p>Look for the Share icon at the bottom of Safari on iPhone.</p>
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDismiss}
            >
              Not now
            </Button>
            <Button type="button" size="sm" className="flex-1" onClick={handleDismiss}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("install-prompt-banner", visible && "install-prompt-banner--visible")}
      role="dialog"
      aria-labelledby="install-banner-title"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/15">
        <BrandLogo size={32} className="shadow-none ring-0" />
      </div>
      <div className="min-w-0 flex-1">
        <p id="install-banner-title" className="text-sm font-semibold text-foreground">
          Install {branding.name}
        </p>
        <p className="text-xs text-muted">One tap — works offline like a native app.</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          disabled={installing}
          onClick={() => void handleInstall()}
          aria-label={`Install ${branding.name}`}
        >
          <Download className="h-4 w-4" aria-hidden />
          {installing ? "…" : "Install"}
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-2 text-muted hover:bg-accent/10"
          aria-label="Dismiss install banner"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
});
