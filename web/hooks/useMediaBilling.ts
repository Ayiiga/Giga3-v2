"use client";

import { useStableUsage } from "@/hooks/useStableUsage";
import { getSessionToken, getUserEmail } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

/** Media studio billing — usage snapshot only (no Paystack config subscription). */
export function useMediaBilling() {
  const email = getUserEmail();
  const [mounted, setMounted] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setSessionToken(getSessionToken());
  }, []);

  const usageRaw = useQuery(
    api.credits.getUsageSnapshot,
    mounted && sessionToken ? { sessionToken } : ("skip" as const)
  );

  const usage = useStableUsage(
    usageRaw as Record<string, unknown> | null | undefined
  );

  return { email, usage, mounted };
}
