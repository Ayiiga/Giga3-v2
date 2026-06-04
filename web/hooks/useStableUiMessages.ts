"use client";

import type { UiMessage } from "@/components/chat/MessageList";
import {
  buildUiMessages,
  messagesEqual,
} from "@/lib/chat/stableMessages";
import { useMemo, useRef } from "react";

/** Keeps the messages array reference stable when Convex re-emits identical rows. */
export function useStableUiMessages(
  messagesRaw: { _id: string; role: string; content: string }[] | undefined,
  pendingUserText: string | null
): UiMessage[] {
  const cacheRef = useRef<UiMessage[]>([]);

  return useMemo(() => {
    const next = buildUiMessages(messagesRaw, pendingUserText);
    if (messagesEqual(cacheRef.current, next)) {
      return cacheRef.current;
    }
    cacheRef.current = next;
    return next;
  }, [messagesRaw, pendingUserText]);
}
