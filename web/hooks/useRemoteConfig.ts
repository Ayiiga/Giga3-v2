"use client";

import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { api } from "convex/_generated/api";
import { useConvex } from "convex/react";
import { useCallback, useEffect, useState } from "react";

type RemoteConfigMap = Record<string, { enabled?: boolean; value?: string }>;

const DEFAULT_REMOTE_CONFIG: RemoteConfigMap = {};

export function useRemoteConfig() {
  const useSupabase = isSupabaseDataBackend();
  const convex = useConvex();
  const [config, setConfig] = useState<RemoteConfigMap | undefined>(
    useSupabase ? DEFAULT_REMOTE_CONFIG : undefined
  );

  useEffect(() => {
    if (useSupabase) {
      setConfig(DEFAULT_REMOTE_CONFIG);
      return;
    }

    let cancelled = false;
    void convex
      .query(api.remoteConfig.getRemoteConfig, { userId: undefined })
      .then((next) => {
        if (!cancelled) setConfig(next ?? DEFAULT_REMOTE_CONFIG);
      })
      .catch((error) => {
        console.warn("[useRemoteConfig] load failed — using defaults", error);
        if (!cancelled) setConfig(DEFAULT_REMOTE_CONFIG);
      });

    return () => {
      cancelled = true;
    };
  }, [convex, useSupabase]);

  const isEnabled = useCallback(
    (key: string): boolean => {
      return config?.[key]?.enabled ?? true;
    },
    [config]
  );

  const getValue = useCallback(
    (key: string, fallback = ""): string => {
      return config?.[key]?.value ?? fallback;
    },
    [config]
  );

  return { config, isEnabled, getValue };
}
