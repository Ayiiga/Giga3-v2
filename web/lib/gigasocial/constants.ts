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
export const SOCIAL_AUDIO_ACCEPT =
  "audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/m4a,audio/wav,audio/x-wav,audio/ogg,audio/aac,audio/webm,.mp3,.m4a,.wav,.ogg,.aac,.webm,.caf";

export const SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC = 15;

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

export const SOCIAL_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/webm",
  "audio/x-caf",
]);

const SOCIAL_AUDIO_MIME_ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-aac": "audio/aac",
  "audio/x-caf": "audio/x-caf",
};

const SOCIAL_AUDIO_EXT_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  webm: "audio/webm",
  caf: "audio/x-caf",
};

/** Resolve a supported audio MIME type from browser metadata or file extension. */
export function resolveAudioContentType(file: Pick<File, "name" | "type">): string | null {
  const raw = file.type?.toLowerCase().split(";")[0].trim();
  if (raw) {
    if (SOCIAL_AUDIO_MIME_TYPES.has(raw)) return raw;
    const alias = SOCIAL_AUDIO_MIME_ALIASES[raw];
    if (alias) return alias;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return SOCIAL_AUDIO_EXT_TO_MIME[ext] ?? null;
}

export const SOCIAL_MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const SOCIAL_MAX_AUDIO_DURATION_SEC = 300;

export const SOCIAL_IMAGE_BUCKETS = ["social-images", "images"] as const;
export const SOCIAL_VIDEO_BUCKETS = ["social-videos", "videos"] as const;
export const SOCIAL_AUDIO_BUCKETS = ["social-audio", "audio"] as const;
export const SOCIAL_AVATAR_BUCKETS = ["avatars", "social-images"] as const;

export type SocialMediaKind = "image" | "video" | "audio";

export type SocialPostMediaItemInput = {
  url: string;
  type: SocialMediaKind;
  durationSec?: number;
  thumbnailUrl?: string;
  storagePath?: string;
  storageBucket?: string;
  filterId?: string;
};

export type SocialUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};
