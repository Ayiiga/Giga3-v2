import type { Doc, Id } from "./_generated/dataModel";

type PostDoc = Doc<"socialPosts">;
type CommentDoc = Doc<"socialComments">;
type ProfileDoc = Doc<"socialProfiles">;

export type PublicSocialAuthor = {
  displayName: string;
  handle: string;
  avatarUrl?: string;
};

export type PublicSocialPost = {
  _id: Id<"socialPosts">;
  body: string;
  mediaUrl?: string;
  postType: PostDoc["postType"];
  communitySlug?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: number;
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
  author: PublicSocialAuthor;
};

const MAX_BODY = 4000;
const MAX_BIO = 600;
const MAX_HANDLE = 32;

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

export function toPublicAuthor(profile: ProfileDoc | null, fallbackId: string): PublicSocialAuthor {
  if (profile) {
    return {
      displayName: profile.displayName,
      handle: profile.handle,
      avatarUrl: profile.avatarUrl,
    };
  }
  const local = fallbackId.split("@")[0] ?? "user";
  return {
    displayName: local,
    handle: local.slice(0, MAX_HANDLE),
  };
}

export function toPublicPost(
  post: PostDoc,
  author: PublicSocialAuthor,
  extras?: { likedByMe?: boolean; bookmarkedByMe?: boolean }
): PublicSocialPost {
  return {
    _id: post._id,
    body: post.body,
    mediaUrl: post.mediaUrl,
    postType: post.postType,
    communitySlug: post.communitySlug,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    shareCount: post.shareCount,
    createdAt: post.createdAt,
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
