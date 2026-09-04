/** Media Studio video credit tiers — mirror convex/mediaVideoCredits.ts */

import { MEDIA_VIDEO_DURATION_OPTIONS } from "@/lib/media/videoLimits";

export const MEDIA_VIDEO_CREDIT_TIERS: ReadonlyArray<{ durationSec: number; credits: number }> = [
  { durationSec: 5, credits: 9 },
  { durationSec: 10, credits: 20 },
  { durationSec: 15, credits: 30 },
];

export function mediaVideoCreditCost(durationSec: number | undefined): number {
  const d = Math.round(durationSec ?? 10);
  if (d <= 5) return 9;
  return d * 2;
}

export function minMediaVideoCreditCost(): number {
  return MEDIA_VIDEO_CREDIT_TIERS[0]?.credits ?? 9;
}

export function snapMediaVideoDurationSec(value: number | undefined): number {
  const requested = Math.round(value ?? 10);
  let best = MEDIA_VIDEO_DURATION_OPTIONS[0];
  for (const option of MEDIA_VIDEO_DURATION_OPTIONS) {
    if (Math.abs(option - requested) < Math.abs(best - requested)) {
      best = option;
    }
  }
  return best;
}
