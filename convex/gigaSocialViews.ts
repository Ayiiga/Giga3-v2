import type { Doc, Id } from "./_generated/dataModel";

type PostDoc = Doc<"socialPosts">;
type CommentDoc = Doc<"socialComments">;
type ProfileDoc = Doc<"socialProfiles">;

export type PublicSocialAuthor = {
  displayName: string;
  handle: string;
  avatarUrl?: string;
  userId?: string;
  supportingByMe?: boolean;
};

export type PublicSocialPost = {
  _id: Id<"socialPosts">;
  body: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  mediaItems?: SocialPostMediaItem[];
  mediaType?: PostDoc["mediaType"];
  videoDurationSec?: number;
  videoThumbnailUrl?: string;
  hashtags?: string[];
  mentions?: string[];
  visibility?: "public" | "followers";
  viewCount?: number;
  postType: PostDoc["postType"];
  communitySlug?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: number;
  pinnedAt?: number;
  author: PublicSocialAuthor;
  likedByMe?: boolean;
  bookmarkedByMe?: boolean;
};

export type PublicSocialComment = {
  _id: Id<"socialComments">;
  postId: Id<"socialPosts">;
  body: string;
  parentId?: Id<"socialComments">;
  createdAt: number;
  pinnedAt?: number;
  author: PublicSocialAuthor;
};

const MAX_BODY = 4000;
const MAX_BIO = 600;
const MAX_HANDLE = 32;
const MAX_HASHTAGS = 30;
const MAX_MENTIONS = 20;
const MAX_MEDIA_ITEMS = 10;

const HASHTAG_RE = /#([\p{L}\p{N}_]{1,64})/gu;
const MENTION_RE = /@([\p{L}\p{N}_-]{1,32})/gu;

export function extractHashtags(raw: string): string[] {
  const tags = new Set<string>();
  for (const match of raw.matchAll(HASHTAG_RE)) {
    const tag = match[1]?.toLowerCase();
    if (tag) tags.add(tag);
    if (tags.size >= MAX_HASHTAGS) break;
  }
  return [...tags];
}

/** Future-ready mention parsing — stored separately from body. */
export function extractMentions(raw: string): string[] {
  const mentions = new Set<string>();
  for (const match of raw.matchAll(MENTION_RE)) {
    const handle = match[1]?.toLowerCase();
    if (handle) mentions.add(handle);
    if (mentions.size >= MAX_MENTIONS) break;
  }
  return [...mentions];
}

export type SocialPostMediaItem = {
  url: string;
  type: "image" | "video" | "audio";
  durationSec?: number;
  thumbnailUrl?: string;
  storagePath?: string;
  storageBucket?: string;
  filterId?: string;
};

export function parseMediaMetaJson(raw: string | undefined | null): SocialPostMediaItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SocialPostMediaItem =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as SocialPostMediaItem).url === "string" &&
          ((item as SocialPostMediaItem).type === "image" ||
            (item as SocialPostMediaItem).type === "video" ||
            (item as SocialPostMediaItem).type === "audio")
      )
      .slice(0, MAX_MEDIA_ITEMS);
  } catch {
    return [];
  }
}

export function serializeMediaMeta(items: SocialPostMediaItem[]): string {
  return JSON.stringify(items.slice(0, MAX_MEDIA_ITEMS));
}

export function inferMediaType(
  items: SocialPostMediaItem[]
): "none" | "image" | "video" | "gallery" {
  if (!items.length) return "none";
  const hasVideo = items.some((i) => i.type === "video");
  const imageCount = items.filter((i) => i.type === "image").length;
  if (hasVideo) return "video";
  if (imageCount > 1) return "gallery";
  return "image";
}

export function inferPostTypeFromMedia(
  items: SocialPostMediaItem[],
  requested?: PostDoc["postType"]
): PostDoc["postType"] {
  if (items.some((i) => i.type === "video")) return "video";
  if (items.some((i) => i.type === "image")) {
    return requested && requested !== "text" && requested !== "video"
      ? requested
      : "image";
  }
  return requested ?? "text";
}

export function sanitizeSocialText(
  raw: string,
  maxLen = MAX_BODY
): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, maxLen);
}

export function normalizeSocialHandle(handle: string): string {
  return handle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_HANDLE);
}

export function toPublicAuthor(
  profile: ProfileDoc | null,
  fallbackId: string,
  extras?: { userId?: string; supportingByMe?: boolean }
): PublicSocialAuthor {
  const userId = extras?.userId ?? profile?.userId ?? fallbackId;
  if (profile) {
    return {
      displayName: profile.displayName,
      handle: profile.handle,
      avatarUrl: profile.avatarUrl,
      userId,
      supportingByMe: extras?.supportingByMe,
    };
  }
  const local = fallbackId.split("@")[0] ?? "user";
  return {
    displayName: local,
    handle: local.slice(0, MAX_HANDLE),
    userId,
    supportingByMe: extras?.supportingByMe,
  };
}

export function toPublicPost(
  post: PostDoc,
  author: PublicSocialAuthor,
  extras?: { likedByMe?: boolean; bookmarkedByMe?: boolean }
): PublicSocialPost {
  const mediaUrls =
    post.mediaUrls && post.mediaUrls.length > 0
      ? post.mediaUrls
      : post.mediaUrl
        ? [post.mediaUrl]
        : undefined;
  const mediaItems = parseMediaMetaJson(post.mediaMetaJson);

  return {
    _id: post._id,
    body: post.body,
    mediaUrl: post.mediaUrl ?? mediaUrls?.[0],
    mediaUrls,
    mediaItems: mediaItems.length ? mediaItems : undefined,
    mediaType: post.mediaType,
    videoDurationSec: post.videoDurationSec,
    videoThumbnailUrl: post.videoThumbnailUrl,
    hashtags: post.hashtags,
    mentions: post.mentions,
    visibility: post.visibility,
    viewCount: post.viewCount,
    postType: post.postType,
    communitySlug: post.communitySlug,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    shareCount: post.shareCount,
    createdAt: post.createdAt,
    pinnedAt: post.pinnedAt,
    author,
    likedByMe: extras?.likedByMe,
    bookmarkedByMe: extras?.bookmarkedByMe,
  };
}

export function toPublicComment(
  comment: CommentDoc,
  author: PublicSocialAuthor
): PublicSocialComment {
  return {
    _id: comment._id,
    postId: comment.postId,
    body: comment.body,
    parentId: comment.parentId,
    createdAt: comment.createdAt,
    pinnedAt: comment.pinnedAt,
    author,
  };
}

export function defaultGamificationJson(): string {
  return JSON.stringify({
    xp: 0,
    level: 1,
    streakDays: 0,
    lastActiveDate: null,
    badges: [] as string[],
  });
}

export function parseGamification(raw: string | undefined | null) {
  const fallback = {
    xp: 0,
    level: 1,
    streakDays: 0,
    lastActiveDate: null as string | null,
    badges: [] as string[],
  };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<typeof fallback>;
    return {
      xp: typeof parsed.xp === "number" ? parsed.xp : 0,
      level: typeof parsed.level === "number" ? parsed.level : 1,
      streakDays: typeof parsed.streakDays === "number" ? parsed.streakDays : 0,
      lastActiveDate:
        typeof parsed.lastActiveDate === "string" ? parsed.lastActiveDate : null,
      badges: Array.isArray(parsed.badges)
        ? parsed.badges.filter((b): b is string => typeof b === "string")
        : [],
    };
  } catch {
    return fallback;
  }
}

export function awardXp(
  currentJson: string | undefined | null,
  amount: number
): string {
  const state = parseGamification(currentJson);
  const today = new Date().toISOString().slice(0, 10);
  let streakDays = state.streakDays;
  if (state.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    streakDays = state.lastActiveDate === yesterdayKey ? streakDays + 1 : 1;
  }
  const xp = state.xp + amount;
  const level = Math.max(1, Math.floor(xp / 100) + 1);
  const badges = [...state.badges];
  if (xp >= 50 && !badges.includes("first_steps")) badges.push("first_steps");
  if (xp >= 200 && !badges.includes("community_member")) badges.push("community_member");
  if (streakDays >= 3 && !badges.includes("streak_3")) badges.push("streak_3");
  return JSON.stringify({
    xp,
    level,
    streakDays,
    lastActiveDate: today,
    badges,
  });
}

export function sanitizeBio(raw: string): string {
  return sanitizeSocialText(raw, MAX_BIO);
}
