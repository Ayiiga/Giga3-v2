"use client";

import {
  getViewedStoryIds,
  hasUnviewedStories,
  subscribeToViewedStories,
} from "@/lib/gigasocial/storiesStorage";
import {
  getCachedStoryIds,
  pruneStoriesMediaCache,
  subscribeToStoriesMediaCache,
} from "@/lib/gigasocial/storiesMediaCache";
import {
  loadReelsSnapshot,
  offlineViewedReels,
  saveReelsSnapshot,
} from "@/lib/gigasocial/storiesOfflineSnapshot";
import { extractStoryReels, STORIES_REEL_FETCH_LIMIT } from "@/lib/gigasocial/storiesUtils";
import type { SocialPost } from "@/lib/gigasocial/types";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

export function useGigaSocialStories(sessionToken?: string | null) {
  const online = useOnlineStatus();
  const feed = useQuery(
    api.gigaSocial.listFeed,
    online
      ? {
          sessionToken: sessionToken ?? undefined,
          limit: STORIES_REEL_FETCH_LIMIT,
        }
      : ("skip" as const)
  );

  const [viewedRevision, setViewedRevision] = useState(0);
  const [cacheRevision, setCacheRevision] = useState(0);
  const [cachedIdSet, setCachedIdSet] = useState<Set<string>>(new Set());

  useEffect(() => subscribeToViewedStories(() => setViewedRevision((n) => n + 1)), []);
  useEffect(
    () => subscribeToStoriesMediaCache(() => setCacheRevision((n) => n + 1)),
    []
  );

  useEffect(() => {
    let cancelled = false;
    void getCachedStoryIds().then((ids) => {
      if (!cancelled) setCachedIdSet(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheRevision]);

  const onlineReels = useMemo(
    () => extractStoryReels((feed?.posts ?? []) as SocialPost[]),
    [feed?.posts]
  );

  useEffect(() => {
    if (!online || !onlineReels.length) return;
    saveReelsSnapshot(onlineReels);
    const viewed = getViewedStoryIds();
    void pruneStoriesMediaCache({
      activePostIds: new Set(onlineReels.map((post) => post._id)),
      viewedPostIds: viewed,
    });
  }, [online, onlineReels]);

  const offlineSnapshot = useMemo(() => {
    if (online) return null;
    return loadReelsSnapshot();
  }, [online]);

  const viewedIds = useMemo(() => {
    void viewedRevision;
    return getViewedStoryIds();
  }, [viewedRevision]);

  const reels = useMemo(() => {
    if (online) return onlineReels;
    const viewed = offlineViewedReels(offlineSnapshot, viewedIds);
    if (!cachedIdSet.size) return viewed;
    return viewed.filter((post) => cachedIdSet.has(post._id));
  }, [online, onlineReels, offlineSnapshot, viewedIds, cachedIdSet]);

  const reelIds = useMemo(() => reels.map((post) => post._id), [reels]);

  const hasUnviewed = useMemo(() => {
    if (!online) return false;
    void viewedRevision;
    return hasUnviewedStories(reelIds);
  }, [online, reelIds, viewedRevision]);

  const offlineCachedReels = useMemo(
    () => reels.filter((post) => cachedIdSet.has(post._id)),
    [reels, cachedIdSet]
  );

  return {
    reels,
    reelIds,
    hasUnviewed,
    viewedIds,
    cachedIdSet,
    offlineCachedReels,
    loading: online && feed === undefined,
    offline: !online,
    hasOfflineSnapshot: Boolean(offlineSnapshot?.length),
  };
}
