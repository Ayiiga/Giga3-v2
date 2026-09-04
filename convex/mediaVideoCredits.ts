/** Media Studio video credit tiers (duration → credits). */

import { MEDIA_VIDEO_DURATION_OPTIONS } from "./mediaVideoLimits";

export const MEDIA_VIDEO_CREDIT_TIERS: ReadonlyArray<{ durationSec: number; credits: number }> = [
  { durationSec: 5, credits: 9 },
  { durationSec: 10, credits: 20 },
  { durationSec: 15, credits: 30 },
];

/** Credits charged for a Media Studio video at the given length. */
export function mediaVideoCreditCost(durationSec: number | undefined): number {
  const d = Math.round(durationSec ?? 10);
  if (d <= 5) return 9;
  return d * 2;
}

export function minMediaVideoCreditCost(): number {
  return MEDIA_VIDEO_CREDIT_TIERS[0]?.credits ?? 9;
}

/** Snap an arbitrary duration to the nearest supported UI tier. */
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
