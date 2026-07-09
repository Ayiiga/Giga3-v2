import type { SocialPost } from "@/lib/gigasocial/types";

export type PostMediaKind = "none" | "video" | "image" | "gallery" | "audio";

const AUDIO_URL_PATTERN = /\.(mp3|m4a|wav|ogg|aac|flac)(\?|$)/i;

export function getPostMediaUrls(post: SocialPost): string[] {
  return post.mediaUrls ?? (post.mediaUrl ? [post.mediaUrl] : []);
}

export function isAudioMediaUrl(url: string): boolean {
  return AUDIO_URL_PATTERN.test(url);
}

export function getPostMediaKind(post: SocialPost): PostMediaKind {
  const urls = getPostMediaUrls(post);
  if (!urls.length) return "none";

  const isVideo =
    post.mediaType === "video" ||
    post.postType === "video" ||
    (urls.length === 1 && Boolean(post.videoDurationSec));

  if (isVideo) return "video";
  if (urls.some(isAudioMediaUrl)) return "audio";
  if (urls.length > 1 || post.mediaType === "gallery") return "gallery";
  return "image";
}

export function postHasPlayableMedia(post: SocialPost): boolean {
  return getPostMediaKind(post) !== "none";
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
