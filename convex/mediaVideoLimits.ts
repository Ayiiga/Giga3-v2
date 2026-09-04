/** Media Studio video generation limits (shared product policy). */

export const MEDIA_VIDEO_MIN_DURATION_SEC = 10;
export const MEDIA_VIDEO_MAX_DURATION_SEC = 60;
export const MEDIA_VIDEO_DEFAULT_DURATION_SEC = 30;

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
