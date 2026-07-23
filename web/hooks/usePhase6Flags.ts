"use client";

import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import {
  mergeRemotePhase6Flags,
  type Phase6Flags,
  PHASE6_FLAG_DEFAULTS,
} from "@/lib/phase6Flags";
import { useMemo } from "react";

/** Live Phase 6 flags from remoteConfig (defaults OFF). */
export function usePhase6Flags(): Phase6Flags {
  const { config } = useRemoteConfig();
  return useMemo(() => {
    if (!config) return PHASE6_FLAG_DEFAULTS;
    return mergeRemotePhase6Flags(
      config as Record<string, { enabled: boolean; value: string }>
    );
  }, [config]);
}
