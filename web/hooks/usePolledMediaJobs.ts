"use client";

import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { useStableMediaJobs, type MediaJobRow } from "@/hooks/useStableMediaJobs";
import { getSessionToken } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { hasActiveMediaJobs, mediaJobsEqual } from "@/lib/media/stableJobs";
import { getAdaptivePollIntervalMs } from "@/lib/network/polling";
import { listSupabaseGenerations } from "@/lib/supabase/data";
import { api } from "convex/_generated/api";
import { useConvex } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_ACTIVE_MS = 15_000;

/**
 * Fetches media job history without a live subscription.
 * Active (processing) jobs poll every 15s; idle lists refresh only on mount/manual trigger.
 */
export function usePolledMediaJobs(userId: string, mounted: boolean) {
  const convex = useConvex();
  const { tier } = useConnectionQuality();
  const [rawJobs, setRawJobs] = useState<MediaJobRow[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const fetchJobs = useCallback(async () => {
    if (!userId || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const sessionToken = getSessionToken();
      const rows = isSupabaseDataBackend()
        ? await listSupabaseGenerations(userId)
        : sessionToken
          ? ((await convex.query(api.mediaQueries.listJobs, {
              sessionToken,
            })) as MediaJobRow[])
          : [];
      setRawJobs((prev) => {
        if (prev && mediaJobsEqual(prev, rows)) return prev;
        return rows;
      });
    } catch {
      /* keep last good snapshot */
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [convex, userId]);

  const jobs = useStableMediaJobs(rawJobs);
  const processing = hasActiveMediaJobs(jobs);
  const pollMs = getAdaptivePollIntervalMs(tier, POLL_ACTIVE_MS);

  useEffect(() => {
    if (!mounted || !userId) return;
    void fetchJobs();
  }, [mounted, userId, fetchJobs]);

  useEffect(() => {
    if (!mounted || !userId || !processing || pollMs <= 0) return;
    const id = window.setInterval(() => void fetchJobs(), pollMs);
    return () => window.clearInterval(id);
  }, [mounted, userId, processing, pollMs, fetchJobs]);

  return {
    jobs,
    loading: loading && jobs.length === 0,
    refreshJobs: fetchJobs,
  };
}
