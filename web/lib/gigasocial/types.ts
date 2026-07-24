/** Client-side types mirroring Convex public projections. */

export type SocialAuthor = {
  displayName: string;
  handle: string;
  avatarUrl?: string;
  userId?: string;
  supportingByMe?: boolean;
  verified?: boolean;
};

export type SocialComment = {
  _id: string;
  postId: string;
  body: string;
  parentId?: string;
  createdAt: number;
  pinnedAt?: number;
  author: SocialAuthor;
};

export type SocialPost = {
  _id: string;
  body: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  mediaItems?: SocialPostMediaItemInput[];
  mediaType?: "none" | "image" | "video" | "gallery";
  videoDurationSec?: number;
  videoThumbnailUrl?: string;
  hashtags?: string[];
  mentions?: string[];
  visibility?: "public" | "followers";
  viewCount?: number;
  postType: "text" | "image" | "video" | "ai" | "education" | "creator";
  communitySlug?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: number;
  pinnedAt?: number;
  author: SocialAuthor;
  likedByMe?: boolean;
  bookmarkedByMe?: boolean;
};

export type SocialCommunity = {
  slug: string;
  name: string;
  category: string;
  description: string;
  emoji: string;
  memberCount: number;
  joined: boolean;
  /** Phase 3 optional type tag from catalog — ignored by older clients. */
  communityType?: string;
};

export type SocialNotification = {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: number;
  postId?: string;
  communitySlug?: string;
  actor: SocialAuthor | null;
};

export type SocialGamification = {
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string | null;
  badges: string[];
};

export type SocialProfileView = {
  profileId?: string;
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl?: string;
  skills: string[];
  interests: string[];
  achievements?: string[];
  gamification?: SocialGamification;
  communityCount?: number;
  postCount?: number;
  fanCount?: number;
  supportingCount?: number;
  mutualFans?: number;
  totalViews?: number;
  creatorLevel?: number;
  monetizationUnlocked?: boolean;
  coverUrl?: string;
  supporting?: boolean;
  userId?: string;
  likesReceived?: number;
  aiCreationsCount?: number;
  isMain?: boolean;
  accountLabel?: string;
};
