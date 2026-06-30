"use client";

import { SlowNetworkTip } from "@/components/pwa/SlowNetworkTip";

const CHAT_MESSAGE =
  "On slow networks, replies may take a moment. Your message is still processing if chat stalls — wait, then try send again.";

export function SlowNetworkBanner() {
  return <SlowNetworkTip message={CHAT_MESSAGE} />;
}
