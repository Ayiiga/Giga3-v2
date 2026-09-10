"use client";

import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { offlineRecommendations } from "@/lib/recommendations/fallbackRecs";
import type {
  RecommendationItem,
  RecommendationSurface,
} from "@/lib/recommendations/fallbackRecs";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

export function useRecommendations(args: {
  surface: RecommendationSurface;
  sessionToken: string | null;
  currentPersonaId?: string | null;
  limit?: number;
  enabled?: boolean;
}): {
  recommendations: RecommendationItem[];
  loading: boolean;
  offline: boolean;
} {
  const online = useEffectiveOnline();
  const enabled = args.enabled !== false && Boolean(args.sessionToken) && online;
  const result = useQuery(
    api.recommendations.getRecommendations,
    enabled
      ? {
          sessionToken: args.sessionToken!,
          surface: args.surface,
          currentPersonaId: args.currentPersonaId ?? undefined,
          limit: args.limit,
        }
      : "skip"
  );
  const [queryTimedOut, setQueryTimedOut] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setQueryTimedOut(false);
      return;
    }
    if (result !== undefined) {
      setQueryTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setQueryTimedOut(true), 6000);
    return () => window.clearTimeout(timer);
  }, [enabled, result]);

  return useMemo(() => {
    if (!online || queryTimedOut) {
      return {
        recommendations: offlineRecommendations(args.surface, args.limit ?? 4),
        loading: false,
        offline: !online || queryTimedOut,
      };
    }
    if (!args.sessionToken) {
      return { recommendations: [], loading: false, offline: false };
    }
    if (result === undefined) {
      return { recommendations: [], loading: true, offline: false };
    }
    return {
      recommendations: result.recommendations,
      loading: false,
      offline: false,
    };
  }, [online, queryTimedOut, args.sessionToken, args.surface, args.currentPersonaId, args.limit, result]);
}
