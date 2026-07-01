"use client";

import { PlatformAnalytics } from "@/components/analytics/PlatformAnalytics";
import { getConvexClient } from "@/lib/convex";
import { getConvexUrl } from "@/lib/convex/env";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useLayoutEffect, useState } from "react";

/** Non-blocking Convex shell for site-wide presence analytics. */
export function PlatformAnalyticsHost() {
  const [client, setClient] = useState<ConvexReactClient | null>(null);

  useLayoutEffect(() => {
    if (!getConvexUrl()) return;
    setClient(getConvexClient());
  }, []);

  if (!getConvexUrl() || !client) return null;

  return (
    <ConvexProvider client={client}>
      <PlatformAnalytics />
    </ConvexProvider>
  );
}
