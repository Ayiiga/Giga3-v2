"use client";

import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { useEffect, useState } from "react";

export type CacheStatus = {
  effectiveOnline: boolean;
  browserOnline: boolean;
  serviceWorkerControlled: boolean;
  cacheApiAvailable: boolean;
};

/** Lightweight cache/connectivity snapshot for UI — no network calls. */
export function useCacheStatus(): CacheStatus {
  const { effectiveOnline, browserOnline } = useEffectiveOnline();
  const [serviceWorkerControlled, setServiceWorkerControlled] = useState(false);
  const [cacheApiAvailable, setCacheApiAvailable] = useState(false);

  useEffect(() => {
    setServiceWorkerControlled(Boolean(navigator.serviceWorker?.controller));
    setCacheApiAvailable(typeof caches !== "undefined");
    if (!("serviceWorker" in navigator)) return;
    const onChange = () => {
      setServiceWorkerControlled(Boolean(navigator.serviceWorker.controller));
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
    };
  }, []);

  return {
    effectiveOnline,
    browserOnline,
    serviceWorkerControlled,
    cacheApiAvailable,
  };
}
