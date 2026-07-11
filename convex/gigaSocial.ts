import { internalQuery, mutation, query } from "./_generated/server";
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
import type { Id } from "./_generated/dataModel";

async function getOrCreateProfile(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string
) {
  const existing = await ctx.db
    .query("socialProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (existing) return existing;

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
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(id))!;
}

async function resolveAuthor(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string
) {
  const profile = await ctx.db
    .query("socialProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return toPublicAuthor(profile, userId);
}

async function notifyUser(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
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

    rows.sort((a, b) => b.createdAt - a.createdAt);

    const slice = rows.slice(0, cap);
    const authorCache = new Map<string, ReturnType<typeof toPublicAuthor>>();

    let liked = new Set<string>();
    let bookmarked = new Set<string>();
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
    }

    const posts = await Promise.all(
      slice.map(async (post) => {
        let author = authorCache.get(post.authorId);
        if (!author) {
          author = await resolveAuthor(ctx, post.authorId);
          authorCache.set(post.authorId, author);
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

export const listDiscover = query({
  args: {
    sessionToken: v.optional(v.string()),
    filter: v.optional(
      v.union(
        v.literal("trending"),
        v.literal("recent"),
        v.literal("education"),
        v.literal("creator"),
        v.literal("ai")
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
    const posts = await Promise.all(
      slice.map(async (post) => {
        const author = await resolveAuthor(ctx, post.authorId);
        return toPublicPost(post, author);
      })
    );

    return { posts };
  },
});

export const getMyProfile = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const profile = await getOrCreateProfile(ctx, userId);
    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_author_created", (q) => q.eq("authorId", userId))
      .order("desc")
      .take(20);
    const visiblePosts = posts.filter((p) => !p.deletedAt);
    const gamification = parseGamification(profile.gamificationJson);
    const memberships = await ctx.db
      .query("socialCommunityMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      profile: {
        displayName: profile.displayName,
        handle: profile.handle,
        bio: profile.bio ?? "",
        avatarUrl: profile.avatarUrl,
        skills: profile.skills,
        interests: profile.interests,
        achievements: profile.achievementsJson
          ? (JSON.parse(profile.achievementsJson) as string[])
          : [],
        gamification,
        communityCount: memberships.length,
        postCount: visiblePosts.length,
      },
      recentPosts: await Promise.all(
        visiblePosts.map(async (post) =>
          toPublicPost(post, toPublicAuthor(profile, userId))
        )
      ),
    };
  },
});

export const getProfileByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const handle = normalizeSocialHandle(args.handle);
    if (!handle) return null;
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .first();
    if (!profile) return null;

    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_author_created", (q) => q.eq("authorId", profile.userId))
      .order("desc")
      .take(12);
    const visiblePosts = posts.filter((p) => !p.deletedAt);

    return {
      profile: {
        displayName: profile.displayName,
        handle: profile.handle,
        bio: profile.bio ?? "",
        avatarUrl: profile.avatarUrl,
        skills: profile.skills,
        interests: profile.interests,
        gamification: parseGamification(profile.gamificationJson),
        postCount: visiblePosts.length,
      },
      posts: await Promise.all(
        visiblePosts.map(async (post) =>
          toPublicPost(post, toPublicAuthor(profile, profile.userId))
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
      .order("asc")
      .collect();

    const visible = rows.filter((c) => !c.deletedAt);
    const comments = await Promise.all(
      visible.map(async (comment) => {
        const author = await resolveAuthor(ctx, comment.authorId);
        return toPublicComment(comment, author);
      })
    );
    return { comments };
  },
});

export const listNotifications = query({
  args: {
    ...sessionArgs,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const cap = Math.min(args.limit ?? 30, 60);
    const rows = await ctx.db
      .query("socialNotifications")
      .withIndex("by_recipient_created", (q) => q.eq("recipientId", userId))
      .order("desc")
      .take(cap);

    const enriched = await Promise.all(
      rows.map(async (n) => {
        const actor = n.actorId ? await resolveAuthor(ctx, n.actorId) : null;
        return {
          _id: n._id,
          type: n.type,
          message: n.message,
          read: n.read,
          createdAt: n.createdAt,
          postId: n.postId,
          communitySlug: n.communitySlug,
          actor,
        };
      })
    );

    const unreadCount = (
      await ctx.db
        .query("socialNotifications")
        .withIndex("by_recipient_read", (q) =>
          q.eq("recipientId", userId).eq("read", false)
        )
        .collect()
    ).length;

    return { notifications: enriched, unreadCount };
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
        const author = await resolveAuthor(ctx, post.authorId);
        return toPublicPost(post, author, { bookmarkedByMe: true });
      })
    );

    return { posts: posts.filter(Boolean) };
  },
});

export const upsertMyProfile = mutation({
  args: {
    sessionToken: v.string(),
    displayName: v.optional(v.string()),
    handle: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    interests: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const profile = await getOrCreateProfile(ctx, userId);
    const now = Date.now();

    let handle = profile.handle;
    if (args.handle !== undefined) {
      const next = normalizeSocialHandle(args.handle);
      if (!next) throw new Error("Handle is required.");
      const clash = await ctx.db
        .query("socialProfiles")
        .withIndex("by_handle", (q) => q.eq("handle", next))
        .first();
      if (clash && clash.userId !== userId) {
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
      skills: args.skills?.map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 12) ?? profile.skills,
      interests: args.interests?.map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 12) ?? profile.interests,
      updatedAt: now,
    });

    return { ok: true };
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
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
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
          if (duration <= 0 || duration > 300) {
            throw new Error("Music tracks must be 5 minutes or shorter.");
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

    const profile = await getOrCreateProfile(ctx, userId);
    const now = Date.now();
    const mediaUrls = mediaItems.map((m) => m.url);
    const primaryVideo = mediaItems.find((m) => m.type === "video");
    const postType = inferPostTypeFromMedia(mediaItems, args.postType);
    const mediaType = inferMediaType(mediaItems);

    const postId = await ctx.db.insert("socialPosts", {
      authorId: userId,
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

    const author = await resolveAuthor(ctx, post.authorId);
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

    const author = await resolveAuthor(ctx, post.authorId);
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
    const userId = await requireSession(args.sessionToken);
    const unread = await ctx.db
      .query("socialNotifications")
      .withIndex("by_recipient_read", (q) =>
        q.eq("recipientId", userId).eq("read", false)
      )
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
    return { ok: true };
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
