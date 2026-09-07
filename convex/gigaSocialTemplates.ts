import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireSession, tryRequireSession } from "./auth";
import {
  analyzePostForTemplate,
  checkTemplateEligibility,
  type GigaTemplateAnalysis,
  type GigaTemplateModeId,
  type GigaTemplatePolicy,
} from "./gigaSocialTemplateEngine";
import {
  parseMediaMetaJson,
  toPublicAuthor,
  toPublicPost,
} from "./gigaSocialViews";

async function getMainProfileDoc(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string
) {
  const profiles = await ctx.db
    .query("socialProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const main = profiles.find((p) => p.isMain);
  if (main) return main;
  return [...profiles].sort((a, b) => a.createdAt - b.createdAt)[0] ?? null;
}

const templatePolicyValidator = v.union(
  v.literal("off"),
  v.literal("fans"),
  v.literal("public"),
  v.literal("owner")
);

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

async function loadPostAuthor(ctx: import("./_generated/server").QueryCtx, authorId: string) {
  const profile = await getMainProfileDoc(ctx, authorId);
  return toPublicAuthor(profile, authorId);
}

async function resolveTemplateEligibility(
  ctx: import("./_generated/server").QueryCtx,
  postId: Id<"socialPosts">,
  viewerId: string | null
) {
  const post = await ctx.db.get(postId);
  if (!post || post.deletedAt) {
    return {
      eligible: false as const,
      reason: "Post not found.",
      policy: "off" as const,
      isOwner: false,
      availableModes: [] as GigaTemplateModeId[],
      attributionLine: "",
      post: null,
      analysis: null as GigaTemplateAnalysis | null,
    };
  }

  const analysis = await buildAnalysisForPost(ctx, postId);
  if (!analysis) {
    return {
      eligible: false as const,
      reason: "Post not found.",
      policy: "off" as const,
      isOwner: false,
      availableModes: [],
      attributionLine: "",
      post,
      analysis: null as GigaTemplateAnalysis | null,
    };
  }

  const isFan = await isSupporting(ctx, viewerId, post.authorId);
  const eligibility = checkTemplateEligibility({
    policy: (post.templatePolicy ?? "off") as GigaTemplatePolicy,
    viewerId,
    authorId: post.authorId,
    isFan,
    visibility: post.visibility,
    deletedAt: post.deletedAt,
    analysis,
  });

  return { ...eligibility, post, analysis };
}

async function buildAnalysisForPost(
  ctx: import("./_generated/server").QueryCtx,
  postId: Id<"socialPosts">
): Promise<GigaTemplateAnalysis | null> {
  const post = await ctx.db.get(postId);
  if (!post || post.deletedAt) return null;

  const cached = await ctx.db
    .query("socialTemplateCache")
    .withIndex("by_post", (q) => q.eq("postId", postId))
    .first();
  if (cached?.analysisJson) {
    try {
      return JSON.parse(cached.analysisJson) as GigaTemplateAnalysis;
    } catch {
      /* rebuild below */
    }
  }

  const author = await loadPostAuthor(ctx, post.authorId);
  const mediaItems = parseMediaMetaJson(post.mediaMetaJson);
  const analysis = analyzePostForTemplate({
    postId: post._id,
    authorId: post.authorId,
    authorHandle: author.handle,
    body: post.body,
    hashtags: post.hashtags,
    mediaItems,
    mediaType: post.mediaType,
    postType: post.postType,
    videoDurationSec: post.videoDurationSec,
    templatePolicy: (post.templatePolicy ?? "off") as GigaTemplatePolicy,
  });

  return analysis;
}

async function upsertTemplateCache(
  ctx: import("./_generated/server").MutationCtx,
  postId: Id<"socialPosts">,
  analysis: GigaTemplateAnalysis
) {
  const existing = await ctx.db
    .query("socialTemplateCache")
    .withIndex("by_post", (q) => q.eq("postId", postId))
    .first();
  const payload = {
    analysisJson: JSON.stringify(analysis),
    categories: analysis.categories,
    updatedAt: Date.now(),
  };
  if (existing) {
    await ctx.db.patch(existing._id, payload);
  } else {
    await ctx.db.insert("socialTemplateCache", {
      postId,
      templateUseCount: 0,
      ...payload,
    });
  }
}

export const getTemplateEligibility = query({
  args: {
    sessionToken: v.optional(v.string()),
    postId: v.id("socialPosts"),
  },
  handler: async (ctx, args) => {
    const viewerId = args.sessionToken
      ? await tryRequireSession(args.sessionToken)
      : null;
    const resolved = await resolveTemplateEligibility(ctx, args.postId, viewerId);
    const { post: _post, analysis: _analysis, ...eligibility } = resolved;
    return eligibility;
  },
});

export const getPostTemplateAnalysis = query({
  args: {
    sessionToken: v.optional(v.string()),
    postId: v.id("socialPosts"),
  },
  handler: async (ctx, args) => {
    const viewerId = args.sessionToken
      ? await tryRequireSession(args.sessionToken)
      : null;
    const resolved = await resolveTemplateEligibility(ctx, args.postId, viewerId);
    const { post: _post, analysis, ...eligibility } = resolved;
    return {
      eligibility,
      analysis: eligibility.eligible ? analysis : null,
    };
  },
});

export const listDiscoverableTemplates = query({
  args: {
    sessionToken: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewerId = args.sessionToken
      ? await tryRequireSession(args.sessionToken)
      : null;
    const limit = Math.min(Math.max(args.limit ?? 24, 1), 48);
    const rows = await ctx.db
      .query("socialPosts")
      .withIndex("by_created")
      .order("desc")
      .take(120);

    const results: Array<{
      post: ReturnType<typeof toPublicPost>;
      analysis: GigaTemplateAnalysis;
      templateUseCount: number;
    }> = [];

    for (const post of rows) {
      if (post.deletedAt) continue;
      const policy = post.templatePolicy ?? "off";
      if (policy === "off" || policy === "owner") continue;
      if (post.visibility === "followers") {
        const isFan = await isSupporting(ctx, viewerId, post.authorId);
        if (!isFan && viewerId !== post.authorId) continue;
      }
      const analysis = await buildAnalysisForPost(ctx, post._id);
      if (!analysis) continue;
      if (args.category && !analysis.categories.includes(args.category)) continue;

      const author = await loadPostAuthor(ctx, post.authorId);
      const liked = viewerId
        ? await ctx.db
            .query("socialReactions")
            .withIndex("by_post_user", (q) =>
              q.eq("postId", post._id).eq("userId", viewerId)
            )
            .first()
        : null;

      results.push({
        post: toPublicPost(post, author, { likedByMe: Boolean(liked) }),
        analysis,
        templateUseCount: post.templateUseCount ?? 0,
      });
      if (results.length >= limit) break;
    }

    return results.sort(
      (a, b) =>
        (b.templateUseCount ?? 0) - (a.templateUseCount ?? 0) ||
        b.post.likeCount - a.post.likeCount
    );
  },
});

export const setPostTemplatePolicy = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.id("socialPosts"),
    policy: templatePolicyValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) throw new Error("Post not found.");
    if (post.authorId !== userId) throw new Error("Only the creator can change template permissions.");

    await ctx.db.patch(args.postId, {
      templatePolicy: args.policy,
      updatedAt: Date.now(),
    });

    const author = await loadPostAuthor(ctx, post.authorId);
    const analysis = analyzePostForTemplate({
      postId: post._id,
      authorId: post.authorId,
      authorHandle: author.handle,
      body: post.body,
      hashtags: post.hashtags,
      mediaItems: parseMediaMetaJson(post.mediaMetaJson),
      mediaType: post.mediaType,
      postType: post.postType,
      videoDurationSec: post.videoDurationSec,
      templatePolicy: args.policy,
    });
    await upsertTemplateCache(ctx, args.postId, analysis);

    return { ok: true, policy: args.policy };
  },
});

export const recordTemplateUse = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.id("socialPosts"),
    mode: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("sound"),
      v.literal("full")
    ),
    userIdea: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) throw new Error("Post not found.");

    const analysis = await buildAnalysisForPost(ctx, args.postId);
    if (!analysis) throw new Error("Post not found.");

    const isFan = await isSupporting(ctx, userId, post.authorId);
    const eligibility = checkTemplateEligibility({
      policy: (post.templatePolicy ?? "off") as GigaTemplatePolicy,
      viewerId: userId,
      authorId: post.authorId,
      isFan,
      visibility: post.visibility,
      deletedAt: post.deletedAt,
      analysis,
    });
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason ?? "Template use is not allowed for this post.");
    }
    if (!eligibility.availableModes.includes(args.mode)) {
      throw new Error(`The ${args.mode} template mode is not available for this post.`);
    }

    await ctx.db.patch(args.postId, {
      templateUseCount: (post.templateUseCount ?? 0) + 1,
      updatedAt: Date.now(),
    });

    const cache = await ctx.db
      .query("socialTemplateCache")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .first();
    if (cache) {
      await ctx.db.patch(cache._id, {
        templateUseCount: (cache.templateUseCount ?? 0) + 1,
        updatedAt: Date.now(),
      });
    }

    return {
      ok: true,
      analysis,
      attributionLine: eligibility.attributionLine,
      mode: args.mode,
    };
  },
});
