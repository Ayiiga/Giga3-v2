"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useRef } from "react";

/** Credits-only Convex subscription for chat chrome (not full user row). */
export function useChatCredits(email: string | null, mounted: boolean) {
  const raw = useQuery(
    api.users.getChatCredits,
    mounted && email ? { email } : ("skip" as const)
  );

  const cacheRef = useRef<number | null>(null);

  const credits = useMemo(() => {
    if (raw === undefined) return cacheRef.current;
    if (raw === null) {
      cacheRef.current = null;
      return null;
    }
    if (cacheRef.current === raw.credits) return cacheRef.current;
    cacheRef.current = raw.credits;
    return raw.credits;
  }, [raw]);

  return {
    credits,
    loading: raw === undefined,
    userMissing: raw === null,
  };
}
