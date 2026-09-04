/** Media Studio video generation limits (shared product policy). */

export const MEDIA_VIDEO_MIN_DURATION_SEC = 10;
export const MEDIA_VIDEO_MAX_DURATION_SEC = 60;
export const MEDIA_VIDEO_DEFAULT_DURATION_SEC = 30;

/** Replicate Seedance 2.0 accepts 4–15 seconds per clip. */
export const REPLICATE_VIDEO_MAX_DURATION_SEC = 15;
export const REPLICATE_VIDEO_MIN_DURATION_SEC = 4;

export const MEDIA_VIDEO_DURATION_OPTIONS = [
  MEDIA_VIDEO_MIN_DURATION_SEC,
  30,
  MEDIA_VIDEO_MAX_DURATION_SEC,
] as const;

export function clampMediaVideoDurationSec(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return MEDIA_VIDEO_DEFAULT_DURATION_SEC;
  return Math.min(
    MEDIA_VIDEO_MAX_DURATION_SEC,
    Math.max(MEDIA_VIDEO_MIN_DURATION_SEC, Math.round(value))
  );
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
