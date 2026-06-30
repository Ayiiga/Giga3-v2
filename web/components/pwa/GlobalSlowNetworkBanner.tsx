"use client";

import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { SlowNetworkTip } from "@/components/pwa/SlowNetworkTip";

const GLOBAL_MESSAGE =
  "Slow connection? Pages may take longer to load. Chat and video jobs keep processing in the background — check back shortly.";

export function GlobalSlowNetworkBanner() {
  const { online, isSlowNetwork } = useConnectionQuality();
  if (!online || !isSlowNetwork) return null;
  return <SlowNetworkTip message={GLOBAL_MESSAGE} />;
}
