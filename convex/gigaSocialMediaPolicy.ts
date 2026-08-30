/** Server-side GigaSocial feed video limits (must match web/lib/gigasocial/constants.ts). */

export const SOCIAL_MAX_VIDEO_DURATION_SEC = 180;
export const SOCIAL_MAX_VIDEO_BYTES = 250 * 1024 * 1024;

export function assertSocialVideoDuration(durationSec: number | undefined): void {
  const duration = durationSec ?? 0;
  if (duration <= 0 || duration > SOCIAL_MAX_VIDEO_DURATION_SEC) {
    throw new Error("Videos must be 3 minutes or shorter.");
  }
}
