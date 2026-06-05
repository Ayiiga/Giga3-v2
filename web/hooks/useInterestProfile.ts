"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useRef } from "react";

/** Interest-profile-only subscription for the learning banner. */
export function useInterestProfile(email: string | null, mounted: boolean) {
  const raw = useQuery(
    api.users.getInterestProfile,
    mounted && email ? { email } : ("skip" as const)
  );

  const cacheRef = useRef<string | null>(null);

  return useMemo(() => {
    if (raw === undefined) return cacheRef.current;
    const next = raw?.interestProfile ?? null;
    if (cacheRef.current === next) return cacheRef.current;
    cacheRef.current = next;
    return next;
  }, [raw]);
}
