"use client";

import {
  bumpAppBadge,
  clearAppBadgeCount,
  postBadgeMessageToServiceWorker,
  setAppBadgeCount,
} from "@/lib/pwa/appBadge";
import { useCallback } from "react";

/** Frontend-only Badging API helpers — no notification API changes. */
export function useAppBadge() {
  const setCount = useCallback(async (count: number) => {
    await setAppBadgeCount(count);
    postBadgeMessageToServiceWorker("GIGA3_SET_BADGE", count);
  }, []);

  const clear = useCallback(async () => {
    await clearAppBadgeCount();
    postBadgeMessageToServiceWorker("GIGA3_CLEAR_BADGE");
  }, []);

  const bump = useCallback(async (delta = 1) => {
    const next = await bumpAppBadge(delta);
    postBadgeMessageToServiceWorker("GIGA3_SET_BADGE", next);
    return next;
  }, []);

  return { setCount, clear, bump };
}
