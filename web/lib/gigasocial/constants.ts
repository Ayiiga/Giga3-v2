/** GigaSocial media upload limits and MIME allowlists. */

export const SOCIAL_CAPTION_MAX_LENGTH = 4000;
export const SOCIAL_MAX_VIDEO_DURATION_SEC = 40;
export const SOCIAL_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const SOCIAL_MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const SOCIAL_MAX_PHOTOS_PER_POST = 10;
export const SOCIAL_MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const SOCIAL_AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export const SOCIAL_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
export const SOCIAL_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm";

export const SOCIAL_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const SOCIAL_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const SOCIAL_IMAGE_BUCKETS = ["social-images", "images"] as const;
export const SOCIAL_VIDEO_BUCKETS = ["social-videos", "videos"] as const;
export const SOCIAL_AVATAR_BUCKETS = ["avatars", "social-images"] as const;

export type SocialMediaKind = "image" | "video";

export type SocialPostMediaItemInput = {
  url: string;
  type: SocialMediaKind;
  durationSec?: number;
  thumbnailUrl?: string;
  storagePath?: string;
  storageBucket?: string;
};

export type SocialUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};
