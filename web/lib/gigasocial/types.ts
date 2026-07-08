/** Client-side types mirroring Convex public projections. */

export type SocialAuthor = {
  displayName: string;
  handle: string;
  avatarUrl?: string;
};

export type SocialPost = {
  _id: string;
  body: string;
  mediaUrl?: string;
  postType: "text" | "image" | "ai" | "education" | "creator";
  communitySlug?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: number;
  author: SocialAuthor;
  likedByMe?: boolean;
  bookmarkedByMe?: boolean;
};

export type SocialComment = {
  _id: string;
  postId: string;
  body: string;
  parentId?: string;
  createdAt: number;
  author: SocialAuthor;
};

export type SocialCommunity = {
  slug: string;
  name: string;
  category: string;
  description: string;
  emoji: string;
  memberCount: number;
  joined: boolean;
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
};
