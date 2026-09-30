"use client";

import { shouldAllowBackgroundPrefetch } from "@/lib/network/gigaLite";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { useEffect } from "react";

/** Warm the chat JS chunk before navigation — faster first paint on /chat. */
export function useChatBundlePrefetch(enabled = true): void {
  const { saveData, isSlowNetwork } = useConnectionQuality();
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!shouldAllowBackgroundPrefetch({ saveData, isSlowNetwork })) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => {
      void import("@/components/chat/ChatPageRoot");
      void import("@/components/chat/ChatShell");
    });
    return () => cancel(id);
  }, [enabled, saveData, isSlowNetwork]);
}
