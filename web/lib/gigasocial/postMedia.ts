import type { CameraFilterId } from "@/lib/gigasocial/cameraFilters";
import type { SocialPost } from "@/lib/gigasocial/types";
import type { SocialPostMediaItemInput } from "@/lib/gigasocial/constants";

export type PostMediaKind = "none" | "video" | "image" | "gallery" | "audio" | "photo-music";

const AUDIO_URL_PATTERN = /\.(mp3|m4a|wav|ogg|aac|flac|webm)(\?|$)/i;

export function getPostMediaItems(post: SocialPost): SocialPostMediaItemInput[] {
  return post.mediaItems ?? [];
}

export function getPostMediaUrls(post: SocialPost): string[] {
  const items = getPostMediaItems(post);
  if (items.length) {
    return items
      .filter((item) => item.type !== "audio")
      .map((item) => item.url);
  }
  return post.mediaUrls ?? (post.mediaUrl ? [post.mediaUrl] : []);
}

export function getPostAudioUrl(post: SocialPost): string | undefined {
  const audioItem = getPostMediaItems(post).find((item) => item.type === "audio");
  if (audioItem) return audioItem.url;
  const urls = post.mediaUrls ?? (post.mediaUrl ? [post.mediaUrl] : []);
  return urls.find(isAudioMediaUrl);
}

export function getPostImageFilterId(post: SocialPost): CameraFilterId | undefined {
  const imageItem = getPostMediaItems(post).find((item) => item.type === "image");
  const filterId = imageItem?.filterId;
  return filterId as CameraFilterId | undefined;
}

export function isAudioMediaUrl(url: string): boolean {
  return AUDIO_URL_PATTERN.test(url);
}

export function getPostMediaKind(post: SocialPost): PostMediaKind {
  const items = getPostMediaItems(post);
  const urls = post.mediaUrls ?? (post.mediaUrl ? [post.mediaUrl] : []);
  const imageUrls = getPostMediaUrls(post);
  const hasAudio =
    items.some((item) => item.type === "audio") || urls.some(isAudioMediaUrl);

  if (imageUrls.length && hasAudio) return "photo-music";

  if (!imageUrls.length && !urls.length) return "none";

  const isVideo =
    post.mediaType === "video" ||
    post.postType === "video" ||
    items.some((item) => item.type === "video") ||
    (urls.length === 1 && Boolean(post.videoDurationSec));

  if (isVideo) return "video";
  if (hasAudio && !imageUrls.length) return "audio";
  if (imageUrls.length > 1 || post.mediaType === "gallery") return "gallery";
  return "image";
}

export function postHasPlayableMedia(post: SocialPost): boolean {
  return getPostMediaKind(post) !== "none";
}

/** Photo/video posts in the feed — media should dominate the card layout. */
export function postHasVisualFeedMedia(post: SocialPost): boolean {
  const kind = getPostMediaKind(post);
  return kind === "video" || kind === "image" || kind === "gallery" || kind === "photo-music";
}

/** First post with video, audio, or images — used for feed autoplay hero. */
export function findFeaturedMediaPost(
  posts: SocialPost[],
  preferredPostId?: string
): SocialPost | null {
  if (preferredPostId) {
    const highlighted = posts.find((p) => p._id === preferredPostId);
    if (highlighted && postHasPlayableMedia(highlighted)) return highlighted;
  }
  return posts.find(postHasPlayableMedia) ?? null;
}
