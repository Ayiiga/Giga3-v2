"use client";

import { isStandalonePwa, isIOSDevice } from "@/lib/pwa/pwaPlatform";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PwaInstallContextValue {
  install: () => Promise<boolean>;
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

/** Single site-wide listener for `beforeinstallprompt` and install state. */
export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
    if (isStandalonePwa()) {
      setIsInstalled(true);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      if (standaloneQuery.matches) setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    standaloneQuery.addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      standaloneQuery.removeEventListener("change", onDisplayModeChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") setIsInstalled(true);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      install,
      canInstall: Boolean(deferredPrompt) && !isInstalled,
      isInstalled,
      isIOS,
    }),
    [deferredPrompt, install, isInstalled, isIOS]
  );

  return (
    <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return context;
}
