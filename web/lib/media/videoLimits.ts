/** Media Studio video generation limits — mirror convex/mediaVideoLimits.ts */

export const MEDIA_VIDEO_MIN_DURATION_SEC = 10;
export const MEDIA_VIDEO_MAX_DURATION_SEC = 60;
export const MEDIA_VIDEO_DEFAULT_DURATION_SEC = 30;

export const MEDIA_VIDEO_DURATION_OPTIONS = [
  MEDIA_VIDEO_MIN_DURATION_SEC,
  30,
  MEDIA_VIDEO_MAX_DURATION_SEC,
] as const;

export type MediaVideoDurationSec = (typeof MEDIA_VIDEO_DURATION_OPTIONS)[number];
