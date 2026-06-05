"use client";

import type { UsageSnapshot } from "@/lib/credits/constants";
import {
  toUsageSnapshot,
  usageSnapshotEqual,
} from "@/lib/billing/stableUsage";
import { useMemo, useRef } from "react";

export function useStableUsage(
  usageRaw: Record<string, unknown> | null | undefined
): UsageSnapshot | null {
  const cacheRef = useRef<UsageSnapshot | null>(null);

  return useMemo(() => {
    const next = toUsageSnapshot(usageRaw);
    if (usageSnapshotEqual(cacheRef.current, next)) {
      return cacheRef.current;
    }
    cacheRef.current = next;
    return next;
  }, [usageRaw]);
}
