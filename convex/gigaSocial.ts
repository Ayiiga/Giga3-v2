import { internal } from "./_generated/api";
import { internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { socialPostMediaItemValidator, socialPostTypeValidator } from "./schema";
import {
  getCommunityBySlug,
  SOCIAL_COMMUNITIES,
} from "./gigaSocialCommunities";
import {
  awardXp,
  defaultGamificationJson,
  extractHashtags,
  extractMentions,
  inferMediaType,
  inferPostTypeFromMedia,
  normalizeSocialHandle,
  parseGamification,
  parseMediaMetaJson,
  sanitizeBio,
  sanitizeSocialText,
  serializeMediaMeta,
  toPublicAuthor,
  toPublicComment,
  toPublicPost,
  type SocialPostMediaItem,
} from "./gigaSocialViews";
import type { Doc, Id } from "./_generated/dataModel";
import { ensureMonetizationUnlock, isMonetizationUnlocked, parsePrivacySettings } from "./gigaSocialEconomy";
import { consumeSocialWriteRateLimit } from "./socialRateLimit";

const SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC = 15;
export const MAX_SOCIAL_ACCOUNTS_PER_USER = 3;
const MAX_PINNED_POSTS_PER_AUTHOR = 3;
const MAX_PINNED_COMMENTS_PER_POST = 5;

function compareNewestWithPins(
  a: { createdAt: number; pinnedAt?: number },
  b: { createdAt: number; pinnedAt?: number }
): number {
  const aPin = a.pinnedAt ? 1 : 0;
  const bPin = b.pinnedAt ? 1 : 0;
  if (aPin !== bPin) return bPin - aPin;
  if (a.pinnedAt && b.pinnedAt && a.pinnedAt !== b.pinnedAt) {
    return b.pinnedAt - a.pinnedAt;
  }
  return b.createdAt - a.createdAt;
}

async function listProfileDocs(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string
) {
  return ctx.db
    .query("socialProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

async function getMainProfileDoc(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string
) {
  const profiles = await listProfileDocs(ctx, userId);
  if (!profiles.length) return null;
  const main = profiles.find((profile) => profile.isMain === true);
  if (main) return main;
  return [...profiles].sort((a, b) => a.createdAt - b.createdAt)[0] ?? null;
}

async function getProfileDoc(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string
) {
  return getMainProfileDoc(ctx, userId);
}

async function getOwnedProfileDoc(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string,
  profileId: Id<"socialProfiles"> | undefined
) {
  if (!profileId) return getMainProfileDoc(ctx, userId);
  const profile = await ctx.db.get(profileId);
  if (!profile || profile.userId !== userId) {
    throw new Error("That creator account was not found.");
  }
  return profile;
}

async function getOrCreateProfile(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
  userId: string
) {
  const existing = await getMainProfileDoc(ctx, userId);
  if (existing) {
    if (existing.isMain !== true) {
      await ctx.db.patch(existing._id, { isMain: true, updatedAt: Date.now() });
      return (await ctx.db.get(existing._id))!;
    }
    return existing;
  }

  const local = userId.split("@")[0] ?? "user";
  const handle = normalizeSocialHandle(local) || `user-${Date.now()}`;
  const now = Date.now();
  const id = await ctx.db.insert("socialProfiles", {
    userId,
    displayName: local,
    handle,
    bio: "",
    skills: [],
    interests: [],
    achievementsJson: "[]",
    gamificationJson: defaultGamificationJson(),
    isMain: true,
    accountLabel: "Main",
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(id))!;
}

function defaultProfileView(userId: string) {
  const local = userId.split("@")[0] ?? "user";
  const handle = normalizeSocialHandle(local) || `user-${userId.slice(0, 8)}`;
  return {
    displayName: local.slice(0, 80),
    handle,
    bio: "",
    avatarUrl: undefined as string | undefined,
    skills: [] as string[],
    interests: [] as string[],
    achievements: [] as string[],
    gamification: parseGamification(null),
    communityCount: 0,
    postCount: 0,
    fanCount: 0,
    supportingCount: 0,
  };
}

function parseAchievementsJson(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

async function resolveAuthor(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string,
  profileId?: Id<"socialProfiles">
) {
  if (profileId) {
    const specific = await ctx.db.get(profileId);
    if (specific && specific.userId === userId) {
      return toPublicAuthor(specific, userId, { userId });
    }
  }
  const profile = await getMainProfileDoc(ctx, userId);
  return toPublicAuthor(profile, userId, { userId });
}

function enrichAuthorForViewer(
  author: ReturnType<typeof toPublicAuthor>,
  authorId: string,
  viewerId: string | null,
  supportingAuthors: Set<string>
) {
  return {
    ...author,
    userId: authorId,
    supportingByMe:
      viewerId && viewerId !== authorId ? supportingAuthors.has(authorId) : undefined,
  };
}

async function getFanCounts(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string
) {
  const fans = await ctx.db
    .query("socialFollows")
    .withIndex("by_following", (q) => q.eq("followingId", userId))
    .collect();
  const supporting = await ctx.db
    .query("socialFollows")
    .withIndex("by_follower", (q) => q.eq("followerId", userId))
    .collect();
  return { fanCount: fans.length, supportingCount: supporting.length };
}

async function isSupporting(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  viewerId: string | null,
  creatorId: string
) {
  if (!viewerId || viewerId === creatorId) return false;
  const row = await ctx.db
    .query("socialFollows")
    .withIndex("by_pair", (q) =>
      q.eq("followerId", viewerId).eq("followingId", creatorId)
    )
    .first();
  return Boolean(row);
}

function pushCategoryForSocialType(
  type:
    | "like"
    | "comment"
    | "reply"
    | "mention"
    | "follow"
    | "community"
    | "learning"
    | "creator"
): string {
  switch (type) {
    case "comment":
    case "reply":
      return "comment";
    case "mention":
      return "mention";
    case "follow":
      return "follow";
    default:
      return "social";
  }
}

async function resolveUserIdByHandle(
  ctx: { db: MutationCtx["db"] },
  handle: string
): Promise<string | null> {
  const profile = await ctx.db
    .query("socialProfiles")
    .withIndex("by_handle", (q) => q.eq("handle", handle.toLowerCase()))
    .first();
  return profile?.userId ?? null;
}

async function notifyUser(
  ctx: MutationCtx,
  args: {
    recipientId: string;
    type:
      | "like"
      | "comment"
      | "reply"
      | "mention"
      | "follow"
      | "community"
      | "learning"
      | "creator";
    actorId?: string;
    postId?: Id<"socialPosts">;
    communitySlug?: string;
    message: string;
  }
) {
  if (args.recipientId === args.actorId) return;
  await ctx.db.insert("socialNotifications", {
    recipientId: args.recipientId,
    type: args.type,
    actorId: args.actorId,
    postId: args.postId,
    communitySlug: args.communitySlug,
    message: sanitizeSocialText(args.message, 280),
    read: false,
    createdAt: Date.now(),
  });

  const actorProfile = args.actorId ? await getProfileDoc(ctx, args.actorId) : null;
  const actorName = actorProfile?.displayName ?? "Someone";
  const postUrl = args.postId
    ? `/gigasocial/post/?id=${encodeURIComponent(String(args.postId))}`
    : "/gigasocial/";

  await ctx.scheduler.runAfter(0, internal.pushNotificationDispatch.dispatchPushNotification, {
    recipientId: args.recipientId,
    category: pushCategoryForSocialType(args.type),
    title: `GigaSocial · ${actorName}`,
    body: args.message,
    url: postUrl,
    tag: `social-${args.type}-${args.postId ?? "none"}-${args.actorId ?? "system"}`,
    badgeIncrement: 1,
  });
}

export const listCommunities = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId: string | null = null;
    if (args.sessionToken) {
      try {
        userId = await requireSession(args.sessionToken);
      } catch {
        userId = null;
      }
    }

    const memberships = userId
      ? await ctx.db
          .query("socialCommunityMembers")
          .withIndex("by_user", (q) => q.eq("userId", userId!))
          .collect()
      : [];

    const joined = new Set(memberships.map((m) => m.communitySlug));

    const counts = await Promise.all(
      SOCIAL_COMMUNITIES.map(async (community) => {
        const members = await ctx.db
          .query("socialCommunityMembers")
          .withIndex("by_slug", (q) => q.eq("communitySlug", community.slug))
          .collect();
        return { slug: community.slug, memberCount: members.length };
      })
    );
    const countMap = new Map(counts.map((c) => [c.slug, c.memberCount]));

    return SOCIAL_COMMUNITIES.map((c) => ({
      ...c,
      memberCount: countMap.get(c.slug) ?? 0,
      joined: joined.has(c.slug),
    }));
  },
});

export const listFeed = query({
  args: {
    sessionToken: v.optional(v.string()),
    communitySlug: v.optional(v.string()),
    followingOnly: v.optional(v.boolean()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? 20, 40);
    let userId: string | null = null;
    if (args.sessionToken) {
      try {
        userId = await requireSession(args.sessionToken);
      } catch {
        userId = null;
      }
    }

    let rows = args.communitySlug
      ? await ctx.db
          .query("socialPosts")
          .withIndex("by_community_created", (q) =>
            q.eq("communitySlug", args.communitySlug!)
          )
          .order("desc")
          .take(120)
      : await ctx.db
          .query("socialPosts")
          .withIndex("by_created")
          .order("desc")
          .take(120);

    rows = rows.filter((r) => !r.deletedAt);
    if (args.cursor) {
      rows = rows.filter((r) => r.createdAt < args.cursor!);
    }

    if (userId) {
      const follows = await ctx.db
        .query("socialFollows")
        .withIndex("by_follower", (q) => q.eq("followerId", userId))
        .collect();
      const supportingIds = new Set(follows.map((f) => f.followingId));
      rows = rows.filter((post) => {
        if (post.visibility !== "followers") return true;
        if (post.authorId === userId) return true;
        return supportingIds.has(post.authorId);
      });
    } else {
      rows = rows.filter((post) => post.visibility !== "followers");
    }

    if (args.followingOnly) {
      if (!userId) {
        return { posts: [], nextCursor: null };
      }
      const follows = await ctx.db
        .query("socialFollows")
        .withIndex("by_follower", (q) => q.eq("followerId", userId))
        .collect();
      const followingIds = new Set(follows.map((f) => f.followingId));
      rows = rows.filter((r) => followingIds.has(r.authorId));
    }

    rows.sort(compareNewestWithPins);

    const boostedPostIds = new Set<string>();
    const activeBoosts = await ctx.db
      .query("socialPostBoosts")
      .withIndex("by_status_ends", (q) => q.eq("status", "active"))
      .take(200);
    const now = Date.now();
    for (const boost of activeBoosts) {
      if (boost.endsAt > now && boost.targetType === "post") {
        boostedPostIds.add(boost.targetId);
      }
    }
    if (boostedPostIds.size > 0) {
      rows.sort((a, b) => {
        const aBoost = boostedPostIds.has(String(a._id)) ? 1 : 0;
        const bBoost = boostedPostIds.has(String(b._id)) ? 1 : 0;
        if (aBoost !== bBoost) return bBoost - aBoost;
        return compareNewestWithPins(a, b);
      });
    }

    const slice = rows.slice(0, cap);
    const authorCache = new Map<string, ReturnType<typeof toPublicAuthor>>();

    let liked = new Set<string>();
    let bookmarked = new Set<string>();
    let supportingAuthors = new Set<string>();
    if (userId && slice.length) {
      const reactions = await ctx.db
        .query("socialReactions")
        .withIndex("by_user", (q) => q.eq("userId", userId!))
        .collect();
      liked = new Set(reactions.map((r) => r.postId));
      const marks = await ctx.db
        .query("socialBookmarks")
        .withIndex("by_user_created", (q) => q.eq("userId", userId!))
        .collect();
      bookmarked = new Set(marks.map((m) => m.postId));
      const follows = await ctx.db
        .query("socialFollows")
        .withIndex("by_follower", (q) => q.eq("followerId", userId!))
        .collect();
      supportingAuthors = new Set(follows.map((f) => f.followingId));
    }

    const posts = await Promise.all(
      slice.map(async (post) => {
        const cacheKey = `${post.authorId}:${post.profileId ?? "main"}`;
        let author = authorCache.get(cacheKey);
        if (!author) {
          const resolved = await resolveAuthor(ctx, post.authorId, post.profileId);
          author = enrichAuthorForViewer(
            resolved,
            post.authorId,
            userId,
            supportingAuthors
          );
          authorCache.set(cacheKey, author);
        }
        return toPublicPost(post, author, {
          likedByMe: liked.has(post._id),
          bookmarkedByMe: bookmarked.has(post._id),
        });
      })
    );

    const nextCursor =
      slice.length === cap ? slice[slice.length - 1]?.createdAt : null;

    return { posts, nextCursor };
  },
});

export const searchProfiles = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const q = args.query.trim().toLowerCase();
    const cap = Math.min(args.limit ?? 8, 16);
    if (!q || q.length < 2) return { profiles: [] };

    const profiles = await ctx.db.query("socialProfiles").take(400);
    const matched = profiles
      .filter(
        (profile) =>
          profile.handle.includes(q) ||
          profile.displayName.toLowerCase().includes(q) ||
          profile.bio.toLowerCase().includes(q)
      )
      .slice(0, cap);

    return {
      profiles: matched.map((profile) => ({
        userId: profile.userId,
        displayName: profile.displayName,
        handle: profile.handle,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
      })),
    };
  },
});

export const listDiscover = query({
  args: {
    sessionToken: v.optional(v.string()),
    filter: v.optional(
      v.union(
        v.literal("trending"),
        v.literal("recent"),
        v.literal("education"),
        v.literal("creator"),
        v.literal("ai"),
        v.literal("video"),
        v.literal("photo"),
        v.literal("music")
      )
    ),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? 24, 48);
    let rows = await ctx.db
      .query("socialPosts")
      .withIndex("by_created")
      .order("desc")
      .take(200);
    rows = rows.filter((r) => !r.deletedAt);

    const filter = args.filter ?? "recent";
    if (filter === "trending") {
      rows.sort(
        (a, b) =>
          b.likeCount + b.commentCount * 2 + b.shareCount -
          (a.likeCount + a.commentCount * 2 + a.shareCount)
      );
    } else if (filter === "education") {
      rows = rows.filter(
        (r) => r.postType === "education" || r.communitySlug === "education"
      );
    } else if (filter === "creator") {
      rows = rows.filter((r) => r.postType === "creator");
    } else if (filter === "ai") {
      rows = rows.filter((r) => r.postType === "ai");
    } else if (filter === "video") {
      rows = rows.filter((r) => r.mediaType === "video" || r.postType === "video");
    } else if (filter === "photo") {
      rows = rows.filter(
        (r) =>
          r.mediaType === "image" ||
          r.mediaType === "gallery" ||
          r.postType === "image"
      );
    } else if (filter === "music") {
      rows = rows.filter((r) => {
        const items = parseMediaMetaJson(r.mediaMetaJson);
        if (items.some((item) => item.type === "audio")) return true;
        if (items.some((item) => item.filterId === "photo-music")) return true;
        const body = r.body.toLowerCase();
        return (
          body.includes("🎵") ||
          body.includes("#photomusic") ||
          (r.hashtags?.some((tag) => tag.toLowerCase() === "photomusic") ?? false)
        );
      });
    }

    const q = args.query?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.body.toLowerCase().includes(q) ||
          (r.hashtags?.some((tag) => tag.includes(q.replace(/^#/, ""))) ?? false)
      );
    }

    const slice = rows.slice(0, cap);
    let userId: string | null = null;
    if (args.sessionToken) {
      try {
        userId = await requireSession(args.sessionToken);
      } catch {
        userId = null;
      }
    }

    let supportingAuthors = new Set<string>();
    if (userId) {
      const follows = await ctx.db
        .query("socialFollows")
        .withIndex("by_follower", (q) => q.eq("followerId", userId!))
        .collect();
      supportingAuthors = new Set(follows.map((f) => f.followingId));
    }

    const posts = await Promise.all(
      slice.map(async (post) => {
        const resolved = await resolveAuthor(ctx, post.authorId, post.profileId);
        const author = enrichAuthorForViewer(
          resolved,
          post.authorId,
          userId,
          supportingAuthors
        );
        return toPublicPost(post, author);
      })
    );

    return { posts };
  },
});

export const getMyProfile = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    try {
      let userId: string;
      try {
        userId = await requireSession(args.sessionToken);
      } catch {
        return null;
      }

      let profile;
      try {
        profile = await getProfileDoc(ctx, userId);
      } catch {
        return {
          profile: defaultProfileView(userId),
          recentPosts: [],
        };
      }

      if (!profile) {
        return {
          profile: defaultProfileView(userId),
          recentPosts: [],
        };
      }

      let visiblePosts: Doc<"socialPosts">[] = [];
      try {
        const posts = await ctx.db
          .query("socialPosts")
          .withIndex("by_author_created", (q) => q.eq("authorId", userId))
          .order("desc")
          .take(80);
        visiblePosts = posts
          .filter((p) => !p.deletedAt)
          .sort(compareNewestWithPins)
          .slice(0, 20);
      } catch {
        visiblePosts = [];
      }

      const gamification = parseGamification(profile.gamificationJson);
      const fallback = defaultProfileView(userId);

      let communityCount = 0;
      try {
        const memberships = await ctx.db
          .query("socialCommunityMembers")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
        communityCount = memberships.length;
      } catch {
        communityCount = 0;
      }

      let fanCount = 0;
      let supportingCount = 0;
      try {
        const counts = await getFanCounts(ctx, userId);
        fanCount = counts.fanCount;
        supportingCount = counts.supportingCount;
      } catch {
        fanCount = 0;
        supportingCount = 0;
      }

      const author = toPublicAuthor(profile, userId);
      const recentPosts = [];
      for (const post of visiblePosts) {
        try {
          const postAuthor =
            post.profileId && post.profileId !== profile._id
              ? await resolveAuthor(ctx, userId, post.profileId)
              : author;
          recentPosts.push(await toPublicPost(post, postAuthor));
        } catch {
          /* skip posts that fail to serialize */
        }
      }

      const allAccounts = await listProfileDocs(ctx, userId);
      const accounts = [...allAccounts]
        .sort((a, b) => {
          if (a.isMain === true && b.isMain !== true) return -1;
          if (b.isMain === true && a.isMain !== true) return 1;
          return a.createdAt - b.createdAt;
        })
        .map((row) => ({
          profileId: row._id,
          displayName: row.displayName,
          handle: row.handle,
          avatarUrl: row.avatarUrl,
          isMain: row.isMain === true || allAccounts.length === 1,
          accountLabel: row.accountLabel ?? (row.isMain === true ? "Main" : "Creator"),
        }));

      return {
        profile: {
          profileId: profile._id,
          displayName: profile.displayName?.trim() || fallback.displayName,
          handle: profile.handle?.trim() || fallback.handle,
          bio: profile.bio ?? "",
          avatarUrl: profile.avatarUrl,
          skills: Array.isArray(profile.skills) ? profile.skills : [],
          interests: Array.isArray(profile.interests) ? profile.interests : [],
          achievements: parseAchievementsJson(profile.achievementsJson),
          gamification,
          communityCount,
          postCount: visiblePosts.length,
          fanCount,
          supportingCount,
          isMain: true,
          accountLabel: profile.accountLabel ?? "Main",
        },
        accounts,
        maxAccounts: MAX_SOCIAL_ACCOUNTS_PER_USER,
        recentPosts,
      };
    } catch (error) {
      console.error("getMyProfile failed:", error);
      return null;
    }
  },
});

/** Creates a social profile on first visit — safe to call from mutations / client bootstrap. */
export const ensureMyProfile = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const profile = await getOrCreateProfile(ctx, userId);
    return { handle: profile.handle, displayName: profile.displayName };
  },
});

export const getProfileByHandle = query({
  args: {
    handle: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handle = normalizeSocialHandle(args.handle);
    if (!handle) return null;
    let viewerId: string | null = null;
    if (args.sessionToken) {
      try {
        viewerId = await requireSession(args.sessionToken);
      } catch {
        viewerId = null;
      }
    }
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .first();
    if (!profile) return null;

    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_author_created", (q) => q.eq("authorId", profile.userId))
      .order("desc")
      .take(80);
    const isOwner = viewerId === profile.userId;
    const supporting = await isSupporting(ctx, viewerId, profile.userId);

    const visiblePosts = posts
      .filter((p) => {
        if (p.deletedAt) return false;
        if (p.visibility === "followers" && !isOwner && !supporting) return false;
        return true;
      })
      .sort(compareNewestWithPins);

    const { fanCount, supportingCount } = await getFanCounts(ctx, profile.userId);
    const likesReceived = visiblePosts.reduce((sum, p) => sum + (p.likeCount ?? 0), 0);
    const totalViews = visiblePosts.reduce((sum, p) => sum + (p.viewCount ?? 0), 0);
    const aiCreationsCount = visiblePosts.filter((p) => p.postType === "ai").length;
    const gamification = parseGamification(profile.gamificationJson);
    const privacy = parsePrivacySettings(profile.privacySettingsJson);
    const monetizationUnlocked = await isMonetizationUnlocked(ctx, profile);

    let mutualFans = 0;
    if (viewerId && viewerId !== profile.userId) {
      const myFans = await ctx.db
        .query("socialFollows")
        .withIndex("by_following", (q) => q.eq("followingId", viewerId))
        .collect();
      const theirFans = await ctx.db
        .query("socialFollows")
        .withIndex("by_following", (q) => q.eq("followingId", profile.userId))
        .collect();
      const myFanIds = new Set(myFans.map((f) => f.followerId));
      mutualFans = theirFans.filter((f) => myFanIds.has(f.followerId)).length;
    }

    let likedPostIds = new Set<string>();
    if (viewerId) {
      const reactions = await ctx.db
        .query("socialReactions")
        .withIndex("by_user", (q) => q.eq("userId", viewerId))
        .collect();
      likedPostIds = new Set(reactions.map((r) => String(r.postId)));
    }

    return {
      profile: {
        displayName: profile.displayName,
        handle: profile.handle,
        bio: profile.bio ?? "",
        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,
        skills: profile.skills,
        interests: profile.interests,
        gamification,
        postCount: visiblePosts.length,
        fanCount,
        supportingCount,
        mutualFans,
        supporting,
        likesReceived,
        totalViews,
        aiCreationsCount,
        creatorLevel: gamification.level,
        monetizationUnlocked,
        privacy,
        userId: profile.userId,
      },
      posts: await Promise.all(
        visiblePosts.slice(0, 24).map(async (post) =>
          toPublicPost(post, toPublicAuthor(profile, profile.userId), {
            likedByMe: likedPostIds.has(String(post._id)),
          })
        )
      ),
    };
  },
});

export const listComments = query({
  args: {
    postId: v.id("socialPosts"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) return { comments: [] };

    const rows = await ctx.db
      .query("socialComments")
      .withIndex("by_post_created", (q) => q.eq("postId", args.postId))
      .order("desc")
      .collect();

    const visible = rows.filter((c) => !c.deletedAt).sort(compareNewestWithPins);
    const comments = await Promise.all(
      visible.map(async (comment) => {
        const author = await resolveAuthor(ctx, comment.authorId);
        return toPublicComment(comment, author);
      })
    );
    return { comments, postAuthorId: post.authorId };
  },
});

export const listNotifications = query({
  args: {
    sessionToken: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      if (!args.sessionToken?.trim()) {
        return { notifications: [], unreadCount: 0 };
      }

      let userId: string;
      try {
        userId = await requireSession(args.sessionToken);
      } catch {
        return { notifications: [], unreadCount: 0 };
      }

      const cap = Math.min(args.limit ?? 30, 60);
      let rows: Array<{
        _id: Id<"socialNotifications">;
        actorId?: string;
        type: string;
        message: string;
        read: boolean;
        createdAt: number;
        postId?: Id<"socialPosts">;
        communitySlug?: string;
      }> = [];

      try {
        rows = await ctx.db
          .query("socialNotifications")
          .withIndex("by_recipient_created", (q) => q.eq("recipientId", userId))
          .order("desc")
          .take(cap);
      } catch (error) {
        console.error("listNotifications query failed:", error);
        return { notifications: [], unreadCount: 0 };
      }

      const enriched = [];
      for (const n of rows) {
        try {
          const actor = n.actorId ? await resolveAuthor(ctx, n.actorId) : null;
          enriched.push({
            _id: n._id,
            type: n.type,
            message: n.message,
            read: n.read,
            createdAt: n.createdAt,
            postId: n.postId,
            communitySlug: n.communitySlug,
            actor,
          });
        } catch (error) {
          console.error("listNotifications row skipped:", error);
        }
      }

      let unreadCount = 0;
      try {
        unreadCount = (
          await ctx.db
            .query("socialNotifications")
            .withIndex("by_recipient_read", (q) =>
              q.eq("recipientId", userId).eq("read", false)
            )
            .collect()
        ).length;
      } catch {
        try {
          const recent = await ctx.db
            .query("socialNotifications")
            .withIndex("by_recipient_created", (q) => q.eq("recipientId", userId))
            .order("desc")
            .take(200);
          unreadCount = recent.filter((n) => !n.read).length;
        } catch {
          unreadCount = enriched.filter((n) => !n.read).length;
        }
      }

      return { notifications: enriched, unreadCount };
    } catch (error) {
      console.error("listNotifications failed:", error);
      return { notifications: [], unreadCount: 0 };
    }
  },
});

/** Lightweight unread badge query — must never take down GigaSocial shell. */
export const getNotificationUnreadCount = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      if (!args.sessionToken?.trim()) return { unreadCount: 0 };

      let userId: string;
      try {
        userId = await requireSession(args.sessionToken);
      } catch {
        return { unreadCount: 0 };
      }

      try {
        const unread = await ctx.db
          .query("socialNotifications")
          .withIndex("by_recipient_read", (q) =>
            q.eq("recipientId", userId).eq("read", false)
          )
          .collect();
        return { unreadCount: unread.length };
      } catch {
        try {
          const recent = await ctx.db
            .query("socialNotifications")
            .withIndex("by_recipient_created", (q) => q.eq("recipientId", userId))
            .order("desc")
            .take(200);
          return { unreadCount: recent.filter((n) => !n.read).length };
        } catch {
          return { unreadCount: 0 };
        }
      }
    } catch (error) {
      console.error("getNotificationUnreadCount failed:", error);
      return { unreadCount: 0 };
    }
  },
});

export const listBookmarks = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const marks = await ctx.db
      .query("socialBookmarks")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(60);

    const posts = await Promise.all(
      marks.map(async (mark) => {
        const post = await ctx.db.get(mark.postId);
        if (!post || post.deletedAt) return null;
        const author = await resolveAuthor(ctx, post.authorId, post.profileId);
        return toPublicPost(post, author, { bookmarkedByMe: true });
      })
    );

    return { posts: posts.filter(Boolean) };
  },
});

export const upsertMyProfile = mutation({
  args: {
    sessionToken: v.string(),
    profileId: v.optional(v.id("socialProfiles")),
    displayName: v.optional(v.string()),
    handle: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    interests: v.optional(v.array(v.string())),
    privacySettingsJson: v.optional(v.string()),
    accountLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const profile = args.profileId
      ? await getOwnedProfileDoc(ctx, userId, args.profileId)
      : await getOrCreateProfile(ctx, userId);
    if (!profile) throw new Error("Creator account not found.");
    const now = Date.now();

    let handle = profile.handle;
    if (args.handle !== undefined) {
      const next = normalizeSocialHandle(args.handle);
      if (!next) throw new Error("Handle is required.");
      const clash = await ctx.db
        .query("socialProfiles")
        .withIndex("by_handle", (q) => q.eq("handle", next))
        .first();
      if (clash && clash._id !== profile._id) {
        throw new Error("Handle is already taken.");
      }
      handle = next;
    }

    await ctx.db.patch(profile._id, {
      displayName: args.displayName?.trim().slice(0, 80) ?? profile.displayName,
      handle,
      bio: args.bio !== undefined ? sanitizeBio(args.bio) : profile.bio,
      avatarUrl:
        args.avatarUrl !== undefined
          ? args.avatarUrl.trim().slice(0, 500)
          : profile.avatarUrl,
      coverUrl:
        args.coverUrl !== undefined
          ? args.coverUrl.trim().slice(0, 500)
          : profile.coverUrl,
      skills: args.skills?.map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 12) ?? profile.skills,
      interests: args.interests?.map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 12) ?? profile.interests,
      privacySettingsJson:
        args.privacySettingsJson !== undefined
          ? args.privacySettingsJson
          : profile.privacySettingsJson,
      accountLabel:
        args.accountLabel !== undefined
          ? args.accountLabel.trim().slice(0, 40) || profile.accountLabel
          : profile.accountLabel,
      updatedAt: now,
    });

    return { ok: true, profileId: profile._id };
  },
});

export const listMySocialAccounts = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    try {
      const userId = await requireSession(args.sessionToken);
      const profiles = await listProfileDocs(ctx, userId);
      const sorted = [...profiles].sort((a, b) => {
        if (a.isMain === true && b.isMain !== true) return -1;
        if (b.isMain === true && a.isMain !== true) return 1;
        return a.createdAt - b.createdAt;
      });
      return {
        maxAccounts: MAX_SOCIAL_ACCOUNTS_PER_USER,
        accounts: sorted.map((profile) => ({
          profileId: profile._id,
          displayName: profile.displayName,
          handle: profile.handle,
          avatarUrl: profile.avatarUrl,
          isMain: profile.isMain === true || sorted.length === 1,
          accountLabel: profile.accountLabel ?? (profile.isMain === true ? "Main" : "Creator"),
        })),
      };
    } catch {
      return { maxAccounts: MAX_SOCIAL_ACCOUNTS_PER_USER, accounts: [] };
    }
  },
});

export const createSocialAccount = mutation({
  args: {
    sessionToken: v.string(),
    displayName: v.string(),
    handle: v.string(),
    accountLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    await getOrCreateProfile(ctx, userId);
    const existing = await listProfileDocs(ctx, userId);
    if (existing.length >= MAX_SOCIAL_ACCOUNTS_PER_USER) {
      throw new Error(`You can create up to ${MAX_SOCIAL_ACCOUNTS_PER_USER} creator accounts.`);
    }
    const handle = normalizeSocialHandle(args.handle);
    if (!handle) throw new Error("Handle is required.");
    const clash = await ctx.db
      .query("socialProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .first();
    if (clash) throw new Error("Handle is already taken.");
    const now = Date.now();
    const displayName = args.displayName.trim().slice(0, 80) || handle;
    const id = await ctx.db.insert("socialProfiles", {
      userId,
      displayName,
      handle,
      bio: "",
      skills: [],
      interests: [],
      achievementsJson: "[]",
      gamificationJson: defaultGamificationJson(),
      isMain: false,
      accountLabel: (args.accountLabel?.trim().slice(0, 40) || "Creator").slice(0, 40),
      createdAt: now,
      updatedAt: now,
    });
    return { profileId: id, handle, displayName };
  },
});

export const setMainSocialAccount = mutation({
  args: {
    sessionToken: v.string(),
    profileId: v.id("socialProfiles"),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const target = await getOwnedProfileDoc(ctx, userId, args.profileId);
    if (!target) throw new Error("Creator account not found.");
    const now = Date.now();
    const profiles = await listProfileDocs(ctx, userId);
    for (const profile of profiles) {
      const nextMain = profile._id === target._id;
      if (profile.isMain === nextMain) continue;
      await ctx.db.patch(profile._id, { isMain: nextMain, updatedAt: now });
    }
    return { ok: true, profileId: target._id };
  },
});

export const createPost = mutation({
  args: {
    sessionToken: v.string(),
    body: v.string(),
    postType: socialPostTypeValidator,
    mediaUrl: v.optional(v.string()),
    mediaItems: v.optional(v.array(socialPostMediaItemValidator)),
    communitySlug: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("public"), v.literal("followers"))),
    profileId: v.optional(v.id("socialProfiles")),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    await consumeSocialWriteRateLimit(ctx, userId, "create_post");
    const body = sanitizeSocialText(args.body);
    const hashtags = extractHashtags(body);
    const mentions = extractMentions(body);

    let mediaItems: SocialPostMediaItem[] = [];
    if (args.mediaItems?.length) {
      if (args.mediaItems.length > 10) {
        throw new Error("A post can include at most 10 media items.");
      }
      const hasVideo = args.mediaItems.some((m) => m.type === "video");
      const hasAudio = args.mediaItems.some((m) => m.type === "audio");
      const imageCount = args.mediaItems.filter((m) => m.type === "image").length;
      if (hasVideo && args.mediaItems.length > 1) {
        throw new Error("A post can include one video or multiple photos, not both.");
      }
      if (hasAudio && hasVideo) {
        throw new Error("Audio tracks can be added to photo posts only.");
      }
      if (hasAudio && imageCount === 0) {
        throw new Error("Add a photo before attaching music.");
      }
      if (hasAudio && args.mediaItems.filter((m) => m.type === "audio").length > 1) {
        throw new Error("A post can include one music track.");
      }
      for (const item of args.mediaItems) {
        const url = item.url.trim().slice(0, 2000);
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          throw new Error("Invalid media URL.");
        }
        if (item.type === "video") {
          const duration = item.durationSec ?? 0;
          if (duration <= 0 || duration > 40) {
            throw new Error("Videos must be 40 seconds or shorter.");
          }
        }
        if (item.type === "audio") {
          const duration = item.durationSec ?? 0;
          if (duration <= 0 || duration > SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC) {
            throw new Error("Photo music clips must be 15 seconds or shorter.");
          }
        }
        mediaItems.push({
          url,
          type: item.type,
          durationSec: item.durationSec,
          thumbnailUrl: item.thumbnailUrl?.trim().slice(0, 2000),
          storagePath: item.storagePath?.trim().slice(0, 500),
          storageBucket: item.storageBucket?.trim().slice(0, 64),
          filterId: item.filterId?.trim().slice(0, 32),
        });
      }
    } else if (args.mediaUrl?.trim()) {
      const url = args.mediaUrl.trim().slice(0, 2000);
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error("Invalid media URL.");
      }
      mediaItems = [{ url, type: "image" }];
    }

    if (!body && mediaItems.length === 0) {
      throw new Error("Post must include text or media.");
    }

    if (args.communitySlug) {
      const community = getCommunityBySlug(args.communitySlug);
      if (!community) throw new Error("Unknown community.");
      const member = await ctx.db
        .query("socialCommunityMembers")
        .withIndex("by_slug_user", (q) =>
          q.eq("communitySlug", args.communitySlug!).eq("userId", userId)
        )
        .first();
      if (!member) throw new Error("Join the community before posting.");
    }

    const profile = args.profileId
      ? await getOwnedProfileDoc(ctx, userId, args.profileId)
      : await getOrCreateProfile(ctx, userId);
    if (!profile) throw new Error("Creator account not found.");
    const now = Date.now();
    const mediaUrls = mediaItems.map((m) => m.url);
    const primaryVideo = mediaItems.find((m) => m.type === "video");
    const postType = inferPostTypeFromMedia(mediaItems, args.postType);
    const mediaType = inferMediaType(mediaItems);

    const postId = await ctx.db.insert("socialPosts", {
      authorId: userId,
      profileId: profile._id,
      body,
      mediaUrl: mediaUrls[0],
      mediaUrls: mediaUrls.length ? mediaUrls : undefined,
      mediaType: mediaType === "none" ? undefined : mediaType,
      videoDurationSec: primaryVideo?.durationSec,
      videoThumbnailUrl: primaryVideo?.thumbnailUrl,
      hashtags: hashtags.length ? hashtags : undefined,
      mentions: mentions.length ? mentions : undefined,
      mediaMetaJson: mediaItems.length ? serializeMediaMeta(mediaItems) : undefined,
      visibility: args.visibility ?? "public",
      viewCount: 0,
      postType,
      communitySlug: args.communitySlug,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(profile._id, {
      gamificationJson: awardXp(profile.gamificationJson, 15),
      updatedAt: now,
    });

    // Notify @mentioned users
    for (const handle of mentions) {
      const mentionedUserId = await resolveUserIdByHandle(ctx, handle);
      if (!mentionedUserId || mentionedUserId === userId) continue;
      await notifyUser(ctx, {
        recipientId: mentionedUserId,
        type: "mention",
        actorId: userId,
        postId,
        message: "mentioned you in a post",
      });
    }

    // Notify followers of a new post (public posts only, capped for performance)
    if ((args.visibility ?? "public") === "public") {
      const followers = await ctx.db
        .query("socialFollows")
        .withIndex("by_following", (q) => q.eq("followingId", userId))
        .take(100);
      const authorName = profile.displayName;
      for (const follower of followers) {
        if (follower.followerId === userId) continue;
        await notifyUser(ctx, {
          recipientId: follower.followerId,
          type: "creator",
          actorId: userId,
          postId,
          message: `${authorName} published a new post`,
        });
      }
    }

    return { postId };
  },
});

export const updatePost = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.id("socialPosts"),
    body: v.optional(v.string()),
    postType: v.optional(socialPostTypeValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) throw new Error("Post not found.");
    if (post.authorId !== userId) throw new Error("You can only edit your own posts.");

    const body =
      args.body !== undefined ? sanitizeSocialText(args.body) : sanitizeSocialText(post.body);
    if (!body.trim()) throw new Error("Post caption cannot be empty.");

    const hashtags = extractHashtags(body);
    const mentions = extractMentions(body);

    await ctx.db.patch(args.postId, {
      body,
      hashtags: hashtags.length ? hashtags : undefined,
      mentions: mentions.length ? mentions : undefined,
      postType: args.postType ?? post.postType,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const toggleLike = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.id("socialPosts"),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    await consumeSocialWriteRateLimit(ctx, userId, "toggle_like");
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) throw new Error("Post not found.");

    const existing = await ctx.db
      .query("socialReactions")
      .withIndex("by_post_user", (q) =>
        q.eq("postId", args.postId).eq("userId", userId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.postId, {
        likeCount: Math.max(0, post.likeCount - 1),
        updatedAt: Date.now(),
      });
      return { liked: false, likeCount: Math.max(0, post.likeCount - 1) };
    }

    await ctx.db.insert("socialReactions", {
      postId: args.postId,
      userId,
      createdAt: Date.now(),
    });
    const likeCount = post.likeCount + 1;
    await ctx.db.patch(args.postId, { likeCount, updatedAt: Date.now() });

    await notifyUser(ctx, {
      recipientId: post.authorId,
      type: "like",
      actorId: userId,
      postId: args.postId,
      message: "liked your post",
    });

    const profile = await getOrCreateProfile(ctx, userId);
    await ctx.db.patch(profile._id, {
      gamificationJson: awardXp(profile.gamificationJson, 2),
      updatedAt: Date.now(),
    });

    return { liked: true, likeCount };
  },
});

export const addComment = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.id("socialPosts"),
    body: v.string(),
    parentId: v.optional(v.id("socialComments")),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    await consumeSocialWriteRateLimit(ctx, userId, "add_comment");
    const body = sanitizeSocialText(args.body);
    if (!body) throw new Error("Comment cannot be empty.");

    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) throw new Error("Post not found.");

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.postId !== args.postId) {
        throw new Error("Invalid reply target.");
      }
    }

    const commentId = await ctx.db.insert("socialComments", {
      postId: args.postId,
      authorId: userId,
      body,
      parentId: args.parentId,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.postId, {
      commentCount: post.commentCount + 1,
      updatedAt: Date.now(),
    });

    const notifyTarget = args.parentId
      ? (await ctx.db.get(args.parentId))?.authorId
      : post.authorId;

    await notifyUser(ctx, {
      recipientId: notifyTarget ?? post.authorId,
      type: args.parentId ? "reply" : "comment",
      actorId: userId,
      postId: args.postId,
      message: args.parentId ? "replied to your comment" : "commented on your post",
    });

    const profile = await getOrCreateProfile(ctx, userId);
    await ctx.db.patch(profile._id, {
      gamificationJson: awardXp(profile.gamificationJson, 5),
      updatedAt: Date.now(),
    });

    return { commentId };
  },
});

export const setPostPinned = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.id("socialPosts"),
    pinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) throw new Error("Post not found.");
    if (post.authorId !== userId) throw new Error("Only the creator can pin this post.");

    if (args.pinned) {
      const authorPosts = await ctx.db
        .query("socialPosts")
        .withIndex("by_author_created", (q) => q.eq("authorId", userId))
        .order("desc")
        .take(80);
      const pinnedCount = authorPosts.filter(
        (p) => !p.deletedAt && p.pinnedAt && p._id !== args.postId
      ).length;
      if (pinnedCount >= MAX_PINNED_POSTS_PER_AUTHOR) {
        throw new Error(
          `You can pin up to ${MAX_PINNED_POSTS_PER_AUTHOR} posts. Unpin one first.`
        );
      }
      const pinnedAt = Date.now();
      await ctx.db.patch(args.postId, {
        pinnedAt,
        updatedAt: pinnedAt,
      });
      return { pinned: true, pinnedAt };
    }

    await ctx.db.patch(args.postId, {
      pinnedAt: undefined,
      updatedAt: Date.now(),
    });
    return { pinned: false, pinnedAt: null };
  },
});

export const setCommentPinned = mutation({
  args: {
    sessionToken: v.string(),
    commentId: v.id("socialComments"),
    pinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.deletedAt) throw new Error("Comment not found.");
    const post = await ctx.db.get(comment.postId);
    if (!post || post.deletedAt) throw new Error("Post not found.");
    if (post.authorId !== userId) {
      throw new Error("Only the post creator can pin comments.");
    }

    if (args.pinned) {
      const thread = await ctx.db
        .query("socialComments")
        .withIndex("by_post_created", (q) => q.eq("postId", comment.postId))
        .collect();
      const pinnedCount = thread.filter(
        (c) => !c.deletedAt && c.pinnedAt && c._id !== args.commentId
      ).length;
      if (pinnedCount >= MAX_PINNED_COMMENTS_PER_POST) {
        throw new Error(
          `You can pin up to ${MAX_PINNED_COMMENTS_PER_POST} comments on a post.`
        );
      }
      const pinnedAt = Date.now();
      await ctx.db.patch(args.commentId, { pinnedAt });
      return { pinned: true, pinnedAt };
    }

    await ctx.db.patch(args.commentId, { pinnedAt: undefined });
    return { pinned: false, pinnedAt: null };
  },
});

export const toggleBookmark = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.id("socialPosts"),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) throw new Error("Post not found.");

    const existing = await ctx.db
      .query("socialBookmarks")
      .withIndex("by_post_user", (q) =>
        q.eq("postId", args.postId).eq("userId", userId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    }

    await ctx.db.insert("socialBookmarks", {
      postId: args.postId,
      userId,
      createdAt: Date.now(),
    });
    return { bookmarked: true };
  },
});

export const getPublicPost = query({
  args: {
    postId: v.id("socialPosts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) return null;
    if (post.visibility === "followers") return null;

    const author = await resolveAuthor(ctx, post.authorId, post.profileId);
    return toPublicPost(post, author);
  },
});

export const getPublicPostOgBundle = internalQuery({
  args: {
    postId: v.id("socialPosts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) return null;
    if (post.visibility === "followers") return null;

    const author = await resolveAuthor(ctx, post.authorId, post.profileId);
    return {
      post: toPublicPost(post, author),
      mediaMetaJson: post.mediaMetaJson,
    };
  },
});

export const recordPostView = mutation({
  args: {
    postId: v.id("socialPosts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) return { ok: false };
    if (post.visibility === "followers") return { ok: false };

    const viewCount = (post.viewCount ?? 0) + 1;
    await ctx.db.patch(args.postId, { viewCount, updatedAt: Date.now() });

    const boosts = await ctx.db
      .query("socialPostBoosts")
      .withIndex("by_target", (q) =>
        q.eq("targetType", "post").eq("targetId", String(args.postId))
      )
      .collect();
    const now = Date.now();
    for (const boost of boosts) {
      if (boost.status === "active" && boost.endsAt > now) {
        await ctx.db.patch(boost._id, {
          impressions: boost.impressions + 1,
          reach: boost.reach + 1,
        });
      }
    }

    return { ok: true, viewCount };
  },
});

export const recordShare = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.id("socialPosts"),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) throw new Error("Post not found.");

    const shareCount = post.shareCount + 1;
    await ctx.db.patch(args.postId, { shareCount, updatedAt: Date.now() });

    await notifyUser(ctx, {
      recipientId: post.authorId,
      type: "creator",
      actorId: userId,
      postId: args.postId,
      message: "shared your post",
    });

    return { shareCount };
  },
});

export const joinCommunity = mutation({
  args: {
    sessionToken: v.string(),
    communitySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const community = getCommunityBySlug(args.communitySlug);
    if (!community) throw new Error("Unknown community.");

    const existing = await ctx.db
      .query("socialCommunityMembers")
      .withIndex("by_slug_user", (q) =>
        q.eq("communitySlug", args.communitySlug).eq("userId", userId)
      )
      .first();
    if (existing) return { joined: true };

    await ctx.db.insert("socialCommunityMembers", {
      communitySlug: args.communitySlug,
      userId,
      joinedAt: Date.now(),
    });

    const profile = await getOrCreateProfile(ctx, userId);
    await ctx.db.patch(profile._id, {
      gamificationJson: awardXp(profile.gamificationJson, 10),
      updatedAt: Date.now(),
    });

    return { joined: true };
  },
});

export const leaveCommunity = mutation({
  args: {
    sessionToken: v.string(),
    communitySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const existing = await ctx.db
      .query("socialCommunityMembers")
      .withIndex("by_slug_user", (q) =>
        q.eq("communitySlug", args.communitySlug).eq("userId", userId)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return { joined: false };
  },
});

export const markNotificationsRead = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    try {
      const userId = await requireSession(args.sessionToken);
      let unread: Array<{ _id: Id<"socialNotifications"> }> = [];
      try {
        unread = await ctx.db
          .query("socialNotifications")
          .withIndex("by_recipient_read", (q) =>
            q.eq("recipientId", userId).eq("read", false)
          )
          .collect();
      } catch {
        const recent = await ctx.db
          .query("socialNotifications")
          .withIndex("by_recipient_created", (q) => q.eq("recipientId", userId))
          .order("desc")
          .take(200);
        unread = recent.filter((n) => !n.read);
      }
      await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
      return { ok: true };
    } catch (error) {
      console.error("markNotificationsRead failed:", error);
      return { ok: false };
    }
  },
});

export const deletePost = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.id("socialPosts"),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) throw new Error("Post not found.");
    if (post.authorId !== userId) throw new Error("Not allowed.");

    const mediaItems = parseMediaMetaJson(post.mediaMetaJson);
    if (mediaItems.length) {
      const baseUrl = process.env.SUPABASE_URL?.trim()?.replace(/\/$/, "");
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      if (baseUrl && serviceKey) {
        const byBucket = new Map<string, string[]>();
        for (const item of mediaItems) {
          if (!item.storagePath || !item.storageBucket) continue;
          const paths = byBucket.get(item.storageBucket) ?? [];
          paths.push(item.storagePath);
          byBucket.set(item.storageBucket, paths);
        }
        await Promise.all(
          [...byBucket.entries()].map(async ([bucket, paths]) => {
            try {
              await fetch(`${baseUrl}/storage/v1/object/${bucket}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${serviceKey}`,
                  apikey: serviceKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ prefixes: paths }),
              });
            } catch {
              /* best-effort cleanup */
            }
          })
        );
      }
    }

    await ctx.db.patch(args.postId, { deletedAt: Date.now() });
    return { ok: true };
  },
});

export const toggleFan = mutation({
  args: {
    sessionToken: v.string(),
    creatorId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    if (userId === args.creatorId) {
      throw new Error("You cannot fan yourself.");
    }
    const existing = await ctx.db
      .query("socialFollows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", userId).eq("followingId", args.creatorId)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      const fanCount = await getFanCounts(ctx, args.creatorId);
      return { supporting: false, fanCount: fanCount.fanCount };
    }
    await ctx.db.insert("socialFollows", {
      followerId: userId,
      followingId: args.creatorId,
      createdAt: Date.now(),
    });
    await notifyUser(ctx, {
      recipientId: args.creatorId,
      type: "follow",
      actorId: userId,
      message: "became your fan",
    });
    const creatorProfile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.creatorId))
      .first();
    if (creatorProfile) {
      await ensureMonetizationUnlock(ctx, creatorProfile);
    }
    const fanCount = await getFanCounts(ctx, args.creatorId);
    return { supporting: true, fanCount: fanCount.fanCount };
  },
});

export const getFanRelationship = query({
  args: {
    sessionToken: v.string(),
    creatorId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const { fanCount, supportingCount } = await getFanCounts(ctx, args.creatorId);
    const supporting = await isSupporting(ctx, userId, args.creatorId);
    return { fanCount, supportingCount, supporting };
  },
});
