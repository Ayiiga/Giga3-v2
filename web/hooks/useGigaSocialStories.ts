"use client";

import {
  getViewedStoryIds,
  hasUnviewedStories,
  subscribeToViewedStories,
} from "@/lib/gigasocial/storiesStorage";
import { extractStoryReels, STORIES_REEL_FETCH_LIMIT } from "@/lib/gigasocial/storiesUtils";
import type { SocialPost } from "@/lib/gigasocial/types";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

export function useGigaSocialStories(sessionToken?: string | null) {
  const feed = useQuery(api.gigaSocial.listFeed, {
    sessionToken: sessionToken ?? undefined,
    limit: STORIES_REEL_FETCH_LIMIT,
  });

  const [viewedRevision, setViewedRevision] = useState(0);

  useEffect(() => subscribeToViewedStories(() => setViewedRevision((n) => n + 1)), []);

  const reels = useMemo(
    () => extractStoryReels((feed?.posts ?? []) as SocialPost[]),
    [feed?.posts]
  );

  const reelIds = useMemo(() => reels.map((post) => post._id), [reels]);

  const hasUnviewed = useMemo(() => {
    void viewedRevision;
    return hasUnviewedStories(reelIds);
  }, [reelIds, viewedRevision]);

  const viewedIds = useMemo(() => {
    void viewedRevision;
    return getViewedStoryIds();
  }, [viewedRevision]);

  return {
    reels,
    reelIds,
    hasUnviewed,
    viewedIds,
    loading: feed === undefined,
  };
}
