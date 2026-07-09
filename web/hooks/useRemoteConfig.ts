"use client";

import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";

export function useRemoteConfig() {
  const sessionToken = getSessionToken();
  const config = useQuery(api.remoteConfig.getRemoteConfig, {
    userId: sessionToken ? undefined : undefined,
  });

  function isEnabled(key: string): boolean {
    return config?.[key]?.enabled ?? true;
  }

  function getValue(key: string, fallback = ""): string {
    return config?.[key]?.value ?? fallback;
  }

  return { config, isEnabled, getValue };
}
