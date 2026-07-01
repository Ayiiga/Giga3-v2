"use client";

import { useChatBundlePrefetch } from "@/hooks/useChatBundlePrefetch";
import { getSessionToken } from "@/lib/auth";
import { useEffect, useState } from "react";

/** Prefetch chat bundle site-wide when the user already has a session. */
export function GlobalChatPrefetch() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(Boolean(getSessionToken()));
  }, []);
  useChatBundlePrefetch(enabled);
  return null;
}
