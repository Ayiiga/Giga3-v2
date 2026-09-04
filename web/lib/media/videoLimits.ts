/** Media Studio video generation limits — mirror convex/mediaVideoLimits.ts */

export const MEDIA_VIDEO_MIN_DURATION_SEC = 5;
export const MEDIA_VIDEO_MAX_DURATION_SEC = 15;
export const MEDIA_VIDEO_DEFAULT_DURATION_SEC = 10;

export const MEDIA_VIDEO_DURATION_OPTIONS = [5, 10, 15] as const;

export type MediaVideoDurationSec = (typeof MEDIA_VIDEO_DURATION_OPTIONS)[number];
