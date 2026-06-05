"use client";

import {
  chatUserSnapshotEqual,
  toChatUserSnapshot,
  type ChatUserSnapshot,
} from "@/lib/chat/stableUser";
import { useMemo, useRef } from "react";

/** Stable user snapshot reference when Convex re-emits an unchanged user row. */
export function useStableUser(
  userRaw:
    | {
        credits?: number;
        tokens?: number;
        interestProfile?: string | null;
      }
    | null
    | undefined
): ChatUserSnapshot | null {
  const cacheRef = useRef<ChatUserSnapshot | null>(null);

  return useMemo(() => {
    const next = toChatUserSnapshot(userRaw);
    if (chatUserSnapshotEqual(cacheRef.current, next)) {
      return cacheRef.current;
    }
    cacheRef.current = next;
    return next;
  }, [userRaw]);
}
