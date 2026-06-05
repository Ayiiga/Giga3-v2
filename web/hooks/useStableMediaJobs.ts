"use client";

import {
  mediaJobsEqual,
  type MediaJobRow,
} from "@/lib/media/stableJobs";
import { useMemo, useRef } from "react";

export type { MediaJobRow };

export function useStableMediaJobs(
  jobsRaw: MediaJobRow[] | undefined
): MediaJobRow[] {
  const cacheRef = useRef<MediaJobRow[]>([]);

  return useMemo(() => {
    const next = jobsRaw ?? [];
    if (mediaJobsEqual(cacheRef.current, next)) {
      return cacheRef.current;
    }
    cacheRef.current = next;
    return next;
  }, [jobsRaw]);
}
