"use client";

import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import {
  mergeRemotePhase5Flags,
  type Phase5Flags,
  PHASE5_FLAG_DEFAULTS,
} from "@/lib/phase5Flags";
import { useMemo } from "react";

/** Live Phase 5 flags from remoteConfig (defaults OFF). */
export function usePhase5Flags(): Phase5Flags {
  const { config } = useRemoteConfig();
  return useMemo(() => {
    if (!config) return PHASE5_FLAG_DEFAULTS;
    return mergeRemotePhase5Flags(
      config as Record<string, { enabled: boolean; value: string }>
    );
  }, [config]);
}
