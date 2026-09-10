"use client";

import { formatBlogViewLabel } from "@/lib/blog/viewStats";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

// Re-export for convenience
export { formatBlogViewLabel };

/** Live blog view count — optionally records one view on mount. */
export function useBlogViewStats(slug: string, recordOnMount = false) {
  const stats = useQuery(api.blogStats.getStats, { slug });
  const recordView = useMutation(api.blogStats.recordView);
  const viewedRef = useRef(false);
  const [recordedCount, setRecordedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!recordOnMount || viewedRef.current) return;
    viewedRef.current = true;
    void recordView({ slug }).then((result) => {
      if (result.ok && "viewCount" in result) {
        setRecordedCount(result.viewCount);
      }
    });
  }, [recordOnMount, recordView, slug]);

  const viewCount = recordedCount ?? stats?.viewCount ?? 0;
  const loading = stats === undefined && recordedCount === null;

  return { viewCount, loading };
}
