"use client";

import { useStableUsage } from "@/hooks/useStableUsage";
import { getUserEmail } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useProbedQuery } from "@/hooks/useProbedQuery";
import { useEffect, useState } from "react";

/** Media studio billing — usage snapshot only (no Paystack config subscription). */
export function useMediaBilling() {
  const email = getUserEmail();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const usageRaw = useProbedQuery(
    api.credits.getUsageSnapshot,
    mounted && email ? { userId: email } : ("skip" as const)
  );

  const usage = useStableUsage(
    usageRaw as Record<string, unknown> | null | undefined
  );

  return { email, usage, mounted };
}
