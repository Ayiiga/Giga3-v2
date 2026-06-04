"use client";

import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { conversationsEqual } from "@/lib/chat/stableConversations";
import { useMemo, useRef } from "react";

/** Stable array reference when Convex re-emits the same conversation rows. */
export function useStableConversations(
  conversationsRaw: ConversationItem[] | undefined
): ConversationItem[] {
  const cacheRef = useRef<ConversationItem[]>([]);

  return useMemo(() => {
    const next = (conversationsRaw ?? []) as ConversationItem[];
    if (conversationsEqual(cacheRef.current, next)) {
      return cacheRef.current;
    }
    cacheRef.current = next;
    return next;
  }, [conversationsRaw]);
}
