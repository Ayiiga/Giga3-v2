"use client";

import { usePageVisible } from "@/hooks/usePageVisible";
import { getSessionToken } from "@/lib/auth";
import { triggerMediaJobsRefresh } from "@/lib/media/jobsRefresh";
import type { MediaJobRow } from "@/lib/media/stableJobs";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useConvex } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

export type TrackedVideoJob = MediaJobRow & {
  creditsCharged?: number;
  creditsRefunded?: number;
  updatedAt?: number;
};

const POLL_FAST_MS = 4_000;
const POLL_SLOW_MS = 8_000;
const TRACKED_JOB_KEY = "giga3_media_video_job";
/** After this, keep polling but tell the user it is taking longer than usual. */
export const VIDEO_SLOW_NOTICE_MS = 4 * 60 * 1000;

/**
 * Follows one Media Studio video job by polling `mediaQueries.getJob` while it
 * is processing (fast for the first two minutes, then slower). Polling stops on
 * a terminal status and pauses while the tab is hidden.
 */
export function useMediaVideoJob() {
  const convex = useConvex();
  const pageVisible = usePageVisible();
  const [jobId, setJobId] = useState<Id<"mediaJobs"> | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = sessionStorage.getItem(TRACKED_JOB_KEY);
      return saved ? (saved as Id<"mediaJobs">) : null;
    } catch {
      return null;
    }
  });
  const [job, setJob] = useState<TrackedVideoJob | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);
  const inFlight = useRef(false);

  const fetchJob = useCallback(async () => {
    if (!jobId || inFlight.current) return;
    const sessionToken = getSessionToken();
    if (!sessionToken) return;
    inFlight.current = true;
    try {
      const next = (await convex.query(api.mediaQueries.getJob, {
        sessionToken,
        jobId,
      })) as TrackedVideoJob | null;
      if (next) {
        setJob((prev) =>
          prev &&
          prev.status === next.status &&
          prev.progressLabel === next.progressLabel &&
          prev.outputUrl === next.outputUrl &&
          prev.errorMessage === next.errorMessage
            ? prev
            : next
        );
        if (next.status === "succeeded" || next.status === "failed") {
          try {
            sessionStorage.removeItem(TRACKED_JOB_KEY);
          } catch {
            /* ignore */
          }
          triggerMediaJobsRefresh();
        }
      }
    } catch {
      /* keep last snapshot; next tick retries */
    } finally {
      inFlight.current = false;
    }
  }, [convex, jobId]);

  const track = useCallback((id: Id<"mediaJobs">) => {
    try {
      sessionStorage.setItem(TRACKED_JOB_KEY, id);
    } catch {
      /* private mode */
    }
    setJobId(id);
    setJob({
      _id: id,
      status: "processing",
      mediaType: "video",
      prompt: "",
      progressStage: "queued",
      progressLabel: "Queued",
    });
    setStartedAt(Date.now());
  }, []);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(TRACKED_JOB_KEY);
    } catch {
      /* ignore */
    }
    setJobId(null);
    setJob(null);
    setStartedAt(0);
  }, []);

  const active = Boolean(jobId) && job?.status === "processing";

  useEffect(() => {
    if (!jobId) return;
    void fetchJob();
  }, [jobId, fetchJob]);

  useEffect(() => {
    if (!active || !pageVisible) return;
    const elapsed = Date.now() - startedAt;
    const interval = elapsed < 2 * 60 * 1000 ? POLL_FAST_MS : POLL_SLOW_MS;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchJob();
    }, interval);
    return () => window.clearInterval(id);
  }, [active, pageVisible, startedAt, fetchJob, job?.progressLabel]);

  return { job, active, startedAt, track, clear, refresh: fetchJob };
}
