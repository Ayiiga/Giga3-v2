"use client";

import { useStableUsage } from "@/hooks/useStableUsage";
import { getUserEmail } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

/** Media studio billing — usage snapshot only (no Paystack config subscription). */
export function useMediaBilling() {
  const email = getUserEmail();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const usageRaw = useQuery(
    api.credits.getUsageSnapshot,
    mounted && email ? { userId: email } : ("skip" as const)
  );

  const usage = useStableUsage(
    usageRaw as Record<string, unknown> | null | undefined
  );

  return { email, usage, mounted };
}
