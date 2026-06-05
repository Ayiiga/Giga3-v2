"use client";

import { useStableMediaJobs, type MediaJobRow } from "@/hooks/useStableMediaJobs";
import { hasActiveMediaJobs, mediaJobsEqual } from "@/lib/media/stableJobs";
import { api } from "convex/_generated/api";
import { useConvex } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_IDLE_MS = 30_000;
const POLL_ACTIVE_MS = 15_000;

/**
 * Polls media job history on an interval instead of a live Convex subscription.
 * Active (processing) jobs poll every 15s; idle lists poll every 30s.
 * Failed/terminal jobs do not trigger faster polling.
 */
export function usePolledMediaJobs(userId: string, mounted: boolean) {
  const convex = useConvex();
  const [rawJobs, setRawJobs] = useState<MediaJobRow[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const fetchJobs = useCallback(async () => {
    if (!userId || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const rows = (await convex.query(api.mediaQueries.listJobs, {
        userId,
      })) as MediaJobRow[];
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

  useEffect(() => {
    if (!mounted || !userId) return;
    void fetchJobs();
  }, [mounted, userId, fetchJobs]);

  useEffect(() => {
    if (!mounted || !userId) return;
    const intervalMs = processing ? POLL_ACTIVE_MS : POLL_IDLE_MS;
    const id = window.setInterval(() => void fetchJobs(), intervalMs);
    return () => window.clearInterval(id);
  }, [mounted, userId, processing, fetchJobs]);

  return {
    jobs,
    loading: loading && jobs.length === 0,
    refreshJobs: fetchJobs,
  };
}
