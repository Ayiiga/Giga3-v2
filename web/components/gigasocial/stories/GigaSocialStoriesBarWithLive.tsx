"use client";

import { GigaSocialPanelErrorBoundary } from "@/components/gigasocial/GigaSocialPanelErrorBoundary";
import { GigaSocialStoriesBar } from "@/components/gigasocial/stories/GigaSocialStoriesBar";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { memo, useMemo } from "react";

type GigaSocialStoriesBarWithLiveProps = {
  sessionToken?: string | null;
  className?: string;
  compact?: boolean;
  autoOpen?: boolean;
  autoOpenRingId?: string;
};

function GigaSocialStoriesBarWithLiveInner(props: GigaSocialStoriesBarWithLiveProps) {
  const features = useGigaSocialFeatures();
  const liveStreams = useQuery(
    api.gigaSocialLive.listLiveStreams,
    features.enableGigaLive ? { status: "live", limit: 20 } : "skip"
  );

  const liveHostHandles = useMemo(() => {
    if (!features.enableGigaLive) return undefined;
    const handles = new Set<string>();
    for (const stream of liveStreams?.streams ?? []) {
      const handle =
        typeof stream?.host?.handle === "string"
          ? stream.host.handle.trim().toLowerCase()
          : "";
      if (handle) handles.add(handle);
    }
    return handles;
  }, [features.enableGigaLive, liveStreams?.streams]);

  return <GigaSocialStoriesBar {...props} liveHostHandles={liveHostHandles} />;
}

/** Stories row with optional LIVE badges — isolated so a live-query failure cannot break the feed. */
export const GigaSocialStoriesBarWithLive = memo(function GigaSocialStoriesBarWithLive(
  props: GigaSocialStoriesBarWithLiveProps
) {
  return (
    <GigaSocialPanelErrorBoundary
      panelName="Stories"
      fallback={<GigaSocialStoriesBar {...props} />}
    >
      <GigaSocialStoriesBarWithLiveInner {...props} />
    </GigaSocialPanelErrorBoundary>
  );
});
