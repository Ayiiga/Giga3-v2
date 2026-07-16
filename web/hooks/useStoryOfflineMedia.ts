"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  getCachedStoryPlayback,
  isStoryMediaCached,
} from "@/lib/gigasocial/storiesMediaCache";
import { getPostMediaUrls } from "@/lib/gigasocial/postMedia";
import type { SocialPost } from "@/lib/gigasocial/types";
import { useEffect, useState } from "react";

export function useStoryOfflineMedia(
  post: SocialPost,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? false;
  const online = useOnlineStatus();
  const networkUrl = getPostMediaUrls(post)[0] ?? "";
  const networkPoster = post.videoThumbnailUrl ?? null;

  const [mediaUrl, setMediaUrl] = useState(networkUrl);
  const [posterUrl, setPosterUrl] = useState<string | null>(networkPoster);
  const [offlineAvailable, setOfflineAvailable] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [checkingCache, setCheckingCache] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setMediaUrl(networkUrl);
      setPosterUrl(networkPoster);
      setOfflineAvailable(false);
      setUnavailable(false);
      setCheckingCache(false);
      return;
    }

    let cancelled = false;
    const blobUrls: string[] = [];

    async function resolve() {
      setCheckingCache(true);
      const cached = await getCachedStoryPlayback(post._id);
      if (cancelled) {
        if (cached?.mediaUrl) URL.revokeObjectURL(cached.mediaUrl);
        if (cached?.thumbnailUrl) URL.revokeObjectURL(cached.thumbnailUrl);
        return;
      }

      if (cached?.mediaUrl) {
        blobUrls.push(cached.mediaUrl);
        if (cached.thumbnailUrl) blobUrls.push(cached.thumbnailUrl);
        setMediaUrl(cached.mediaUrl);
        setPosterUrl(cached.thumbnailUrl ?? networkPoster);
        setOfflineAvailable(true);
        setUnavailable(false);
        setCheckingCache(false);
        return;
      }

      if (!online) {
        const hasCached = await isStoryMediaCached(post._id);
        setUnavailable(!hasCached);
        setMediaUrl(hasCached ? "" : "");
        setPosterUrl(networkPoster);
        setOfflineAvailable(false);
        setCheckingCache(false);
        return;
      }

      setMediaUrl(networkUrl);
      setPosterUrl(networkPoster);
      setOfflineAvailable(false);
      setUnavailable(false);
      setCheckingCache(false);
    }

    void resolve();

    return () => {
      cancelled = true;
      for (const url of blobUrls) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
    };
  }, [enabled, networkUrl, networkPoster, online, post._id]);

  return {
    mediaUrl,
    posterUrl,
    offlineAvailable: offlineAvailable && !online,
    unavailable: unavailable && !online,
    checkingCache,
    online,
  };
}
