"use client";

import {
  hasRecordedPostView,
  markPostViewRecorded,
} from "@/lib/gigasocial/postViewTracking";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";

const DEFAULT_THRESHOLD = 0.35;
const DEFAULT_DWELL_MS = 750;
const DEFAULT_ROOT_MARGIN = "0px";

type Options = {
  enabled?: boolean;
  threshold?: number;
  dwellMs?: number;
  rootMargin?: string;
};

/**
 * Records one GigaSocial post view when the card is meaningfully in view.
 * Dedupes per browser tab session so feed scroll + public post page do not
 * double-count the same impression.
 */
export function useRecordGigaSocialPostView<T extends HTMLElement = HTMLElement>(
  postId: string,
  options: Options = {}
) {
  const {
    enabled = true,
    threshold = DEFAULT_THRESHOLD,
    dwellMs = DEFAULT_DWELL_MS,
    rootMargin = DEFAULT_ROOT_MARGIN,
  } = options;
  const recordView = useMutation(api.gigaSocial.recordPostView);
  const ref = useRef<T | null>(null);
  const recordedRef = useRef(false);
  const [recordedViewCount, setRecordedViewCount] = useState<number | null>(null);

  useEffect(() => {
    recordedRef.current = hasRecordedPostView(postId);
  }, [postId]);

  useEffect(() => {
    if (!enabled || !postId || recordedRef.current) return;
    if (hasRecordedPostView(postId)) {
      recordedRef.current = true;
      return;
    }

    const element = ref.current;
    if (!element) return;

    let dwellTimer: number | null = null;
    let cancelled = false;

    const clearDwell = () => {
      if (dwellTimer != null) {
        window.clearTimeout(dwellTimer);
        dwellTimer = null;
      }
    };

    const commitView = () => {
      if (cancelled || recordedRef.current) return;
      if (hasRecordedPostView(postId)) {
        recordedRef.current = true;
        return;
      }
      recordedRef.current = true;
      markPostViewRecorded(postId);
      void recordView({ postId: postId as Id<"socialPosts"> })
        .then((result) => {
          if (result && "ok" in result && result.ok && "viewCount" in result) {
            setRecordedViewCount(result.viewCount);
          }
        })
        .catch(() => {
          /* network — already marked session so we do not spam retries */
        });
    };

    if (typeof IntersectionObserver === "undefined") {
      dwellTimer = window.setTimeout(commitView, dwellMs);
      return () => {
        cancelled = true;
        clearDwell();
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const visible =
          entry.isIntersecting && entry.intersectionRatio >= threshold;
        if (visible) {
          if (dwellTimer == null && !recordedRef.current) {
            dwellTimer = window.setTimeout(commitView, dwellMs);
          }
        } else {
          clearDwell();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => {
      cancelled = true;
      clearDwell();
      observer.disconnect();
    };
  }, [dwellMs, enabled, postId, recordView, rootMargin, threshold]);

  return { ref, recordedViewCount };
}
