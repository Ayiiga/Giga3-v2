"use client";

import type { UiMessage } from "@/components/chat/MessageList";
import {
  buildUiMessages,
  messagesEqual,
} from "@/lib/chat/stableMessages";
import { useMemo, useRef } from "react";

/** Keeps the messages array reference stable when Convex re-emits identical rows. */
export function useStableUiMessages(
  messagesRaw: { _id: string; role: string; content: string; createdAt?: number }[] | undefined,
  pendingUserText: string | null,
  cachedFallback?: UiMessage[] | null
): UiMessage[] {
  const cacheRef = useRef<UiMessage[]>([]);

  return useMemo(() => {
    const rawRows =
      messagesRaw ??
      (cachedFallback?.map((m) => ({
        _id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })) as { _id: string; role: string; content: string; createdAt?: number }[] | undefined);

    const next = buildUiMessages(rawRows, pendingUserText);
    if (messagesEqual(cacheRef.current, next)) {
      return cacheRef.current;
    }
    cacheRef.current = next;
    return next;
  }, [messagesRaw, pendingUserText, cachedFallback]);
}
