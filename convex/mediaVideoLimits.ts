/** Media Studio video generation limits (shared product policy). */

export const MEDIA_VIDEO_MIN_DURATION_SEC = 5;
export const MEDIA_VIDEO_MAX_DURATION_SEC = 15;
export const MEDIA_VIDEO_DEFAULT_DURATION_SEC = 10;

/** Replicate Seedance 2.0 accepts 4–15 seconds per clip. */
export const REPLICATE_VIDEO_MAX_DURATION_SEC = 15;
export const REPLICATE_VIDEO_MIN_DURATION_SEC = 4;

export const MEDIA_VIDEO_DURATION_OPTIONS = [5, 10, 15] as const;

export type MediaVideoDurationSec = (typeof MEDIA_VIDEO_DURATION_OPTIONS)[number];

export function clampMediaVideoDurationSec(value: number | undefined): MediaVideoDurationSec {
  if (!value || !Number.isFinite(value)) return MEDIA_VIDEO_DEFAULT_DURATION_SEC;
  const rounded = Math.round(value);
  if (rounded <= 5) return 5;
  if (rounded <= 10) return 10;
  return 15;
}

/** Clamp to what Replicate Seedance can actually render in one request. */
export function clampReplicateVideoDurationSec(value: number | undefined): number {
  const requested = clampMediaVideoDurationSec(value);
  return Math.min(
    REPLICATE_VIDEO_MAX_DURATION_SEC,
    Math.max(REPLICATE_VIDEO_MIN_DURATION_SEC, requested)
  );
}

/** Clamp a UI request to a specific provider/model ceiling. */
export function clampVideoDurationForProvider(
  value: number | undefined,
  providerMaxSec: number
): number {
  const requested = clampMediaVideoDurationSec(value);
  return Math.min(providerMaxSec, Math.max(REPLICATE_VIDEO_MIN_DURATION_SEC, requested));
}
