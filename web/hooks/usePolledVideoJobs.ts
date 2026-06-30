"use client";

import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { usePageVisible } from "@/hooks/usePageVisible";
import { getSessionToken } from "@/lib/auth";
import { getAdaptivePollIntervalMs } from "@/lib/network/polling";
import {
  hasActiveVideoJobs,
  videoJobsEqual,
  type VideoJobRow,
} from "@/lib/video/stableJobs";
import { api } from "convex/_generated/api";
import { useConvex } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_ACTIVE_MS = 12_000;

/**
 * Polls video job history instead of a live subscription — lighter on 2G/3G links.
 */
export function usePolledVideoJobs(mounted: boolean, sessionToken: string | null) {
  const convex = useConvex();
  const { tier } = useConnectionQuality();
  const pageVisible = usePageVisible();
  const [rawJobs, setRawJobs] = useState<VideoJobRow[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const fetchJobs = useCallback(async () => {
    const token = sessionToken ?? getSessionToken();
    if (!token || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const rows = (await convex.query(api.videoQueries.listJobs, {
        sessionToken: token,
        limit: 12,
      })) as VideoJobRow[];
      setRawJobs((prev) => {
        if (prev && videoJobsEqual(prev, rows)) return prev;
        return rows;
      });
    } catch {
      /* keep last good snapshot on flaky links */
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [convex, sessionToken]);

  const jobs = rawJobs ?? [];
  const processing = hasActiveVideoJobs(jobs);
  const pollMs = getAdaptivePollIntervalMs(tier, POLL_ACTIVE_MS);

  useEffect(() => {
    if (!mounted || !sessionToken) return;
    void fetchJobs();
  }, [mounted, sessionToken, fetchJobs]);

  useEffect(() => {
    if (!mounted || !sessionToken || !processing || pollMs <= 0 || !pageVisible) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchJobs();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [mounted, sessionToken, processing, pollMs, pageVisible, fetchJobs]);

  return {
    jobs,
    loading: loading && jobs.length === 0,
    refreshJobs: fetchJobs,
    processing,
  };
}
