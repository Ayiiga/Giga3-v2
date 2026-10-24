import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { isListingFileApproved } from "./marketplaceListingHelpers";
import { coverIntentStorageIdForListing } from "./marketplaceCover";
import {
  toPublicCreatorProfile,
  toPublicListingResolved,
  toPublicReview,
} from "./marketplaceViews";
import { buildGigaSocialOgMeta, splitPostDisplay } from "./gigaSocialOg";
import {
  normalizeSocialHandle,
  toPublicAuthor,
  toPublicPost,
} from "./gigaSocialViews";

const MAX_SITEMAP_LISTINGS = 500;
/** Build-time and crawler SEO bundles for public Marketplace and GigaSocial pages. */
const MAX_SITEMAP_POSTS = 300;
const MAX_SITEMAP_PROFILES = 300;
/** Skip thin UGC that Search Console typically leaves as Discovered-not-indexed. */
const MIN_SITEMAP_POST_BODY_CHARS = 80;

/** QA / E2E fixtures must not emit indexable Product structured data. */
function isExcludedMarketplaceSeoListing(input: {
  title?: string | null;
  creatorName?: string | null;
  creatorHandle?: string | null;
}): boolean {
  const haystack = [input.title, input.creatorName, input.creatorHandle]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;
  return (
    /\be2e\b/.test(haystack) ||
    /\bqa\s*test\b/.test(haystack) ||
    /\btest\s*ebook\b/.test(haystack) ||
    /\bload\s*test\b/.test(haystack)
  );
}

function truncateDescription(text: string, max = 320): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

/**
 * Published marketplace listings for sitemap / static build.
 * QA fixtures are omitted from sitemaps by default (`includeExcluded: false`)
 * but can be included for static HTML generation so noindex pages still exist.
 */
export const listMarketplaceSitemapEntries = query({
  args: {
    limit: v.optional(v.number()),
    includeExcluded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? MAX_SITEMAP_LISTINGS, MAX_SITEMAP_LISTINGS);
    const includeExcluded = args.includeExcluded === true;
    const rows = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(cap * 2);

    const approved = rows.filter((listing) => isListingFileApproved(listing));
    const withCreators = await Promise.all(
      approved.map(async (listing) => {
        const creator = await ctx.db
          .query("creatorProfiles")
          .withIndex("by_user", (q) => q.eq("userId", listing.creatorId))
          .first();
        return { listing, creator };
      })
    );

    return withCreators
      .filter(({ listing, creator }) => {
        if (includeExcluded) return true;
        return !isExcludedMarketplaceSeoListing({
          title: listing.title,
          creatorName: creator?.displayName,
          creatorHandle: creator?.handle,
        });
      })
      .slice(0, cap)
      .map(({ listing }) => ({
        listingId: listing._id,
        title: listing.title,
        updatedAt: listing.updatedAt ?? listing.createdAt,
      }));
  },
});

/** SEO-safe marketplace bundle — no storage IDs, emails, or download URLs. */
export const getMarketplaceSeoBundle = query({
  args: { listingId: v.id("marketplaceListings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published" || !isListingFileApproved(listing)) {
      return null;
    }

    const creator = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", listing.creatorId))
      .first();

    const reviews = await ctx.db
      .query("marketplaceReviews")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .order("desc")
      .take(50);

    const publicListing = await toPublicListingResolved(ctx.storage, listing, {
      coverIntentStorageId: listing.coverStorageId
        ? undefined
        : await coverIntentStorageIdForListing(ctx, listing._id),
    });
    const ratingValues = reviews.map((r) => r.rating).filter((n) => n >= 1 && n <= 5);
    const reviewCount = ratingValues.length;
    const ratingValue =
      reviewCount > 0
        ? Math.round((ratingValues.reduce((sum, n) => sum + n, 0) / reviewCount) * 10) / 10
        : undefined;
    const creatorPublic = creator ? toPublicCreatorProfile(creator) : null;
    const excludedFromIndex = isExcludedMarketplaceSeoListing({
      title: publicListing.title,
      creatorName: creatorPublic?.displayName,
      creatorHandle: creatorPublic?.handle,
    });

    return {
      listing: publicListing,
      description: truncateDescription(publicListing.description),
      creator: creatorPublic,
      reviewCount,
      ratingValue,
      reviews: reviews.slice(0, 5).map(toPublicReview),
      /** QA fixtures stay reachable but must not be indexed as Products. */
      indexable: !excludedFromIndex,
    };
  },
});

function postHasSitemapSignal(post: { body: string; mediaMetaJson?: string }) {
  const bodyLen = post.body.replace(/\s+/g, " ").trim().length;
  if (bodyLen >= MIN_SITEMAP_POST_BODY_CHARS) return true;
  const media = post.mediaMetaJson?.trim();
  return Boolean(media && media !== "[]" && media !== "{}");
}

/** Public GigaSocial posts for sitemap generation (public visibility only). */
export const listPublicPostSitemapEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? MAX_SITEMAP_POSTS, MAX_SITEMAP_POSTS);
    const rows = await ctx.db.query("socialPosts").order("desc").take(cap * 4);

    return rows
      .filter(
        (post) =>
          !post.deletedAt && post.visibility !== "followers" && postHasSitemapSignal(post)
      )
      .slice(0, cap)
      .map((post) => {
        const display = splitPostDisplay(post.body);
        return {
          postId: post._id,
          title: display.title ?? truncateDescription(display.description, 80),
          updatedAt: post.updatedAt ?? post.createdAt,
        };
      });
  },
});

/** SEO bundle for a public post — excludes private/followers-only content. */
export const getPublicPostSeoBundle = query({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt || post.visibility === "followers") return null;

    const profile = post.profileId
      ? await ctx.db.get(post.profileId)
      : (() => {
          return null;
        })();

    let authorProfile = profile;
    if (!authorProfile) {
      const profiles = await ctx.db
        .query("socialProfiles")
        .withIndex("by_user", (q) => q.eq("userId", post.authorId))
        .collect();
      authorProfile =
        profiles.find((row) => row.isMain === true) ??
        [...profiles].sort((a, b) => a.createdAt - b.createdAt)[0] ??
        null;
    }

    const author = toPublicAuthor(authorProfile, post.authorId, {});
    const publicPost = toPublicPost(post, {
      displayName: author.displayName,
      handle: author.handle,
      avatarUrl: author.avatarUrl,
    });
    const og = buildGigaSocialOgMeta(publicPost, undefined, post.mediaMetaJson);
    const display = splitPostDisplay(post.body);

    return {
      postId: post._id,
      title: og.title,
      description: og.description,
      imageUrl: og.imageUrl,
      imageAlt: og.imageAlt,
      canonicalPath: `/gigasocial/post/${post._id}/`,
      author: {
        displayName: author.displayName,
        handle: author.handle,
        avatarUrl: author.avatarUrl,
      },
      hashtags: post.hashtags ?? [],
      headline: display.title,
      bodyPreview: truncateDescription(display.description, 500),
      createdAt: post.createdAt,
    };
  },
});

/** Public GigaSocial profiles for sitemap generation. */
export const listPublicProfileSitemapEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? MAX_SITEMAP_PROFILES, MAX_SITEMAP_PROFILES);
    const profiles = await ctx.db.query("socialProfiles").order("desc").take(cap * 3);

    const eligible: {
      handle: string;
      displayName: string;
      updatedAt: number;
    }[] = [];

    for (const profile of profiles) {
      if (eligible.length >= cap) break;
      const handle = normalizeSocialHandle(profile.handle);
      if (!handle) continue;

      const bio = (profile.bio ?? "").replace(/\s+/g, " ").trim();
      const displayName = (profile.displayName ?? "").replace(/\s+/g, " ").trim();
      const hasIdentity = bio.length >= 20 || (displayName.length >= 2 && displayName.toLowerCase() !== handle);
      if (!hasIdentity) continue;

      const recent = await ctx.db
        .query("socialPosts")
        .withIndex("by_author_created", (q) => q.eq("authorId", profile.userId))
        .order("desc")
        .take(12);
      const hasPublicPost = recent.some(
        (post) => !post.deletedAt && post.visibility !== "followers" && postHasSitemapSignal(post)
      );
      if (!hasPublicPost) continue;

      eligible.push({
        handle,
        displayName: profile.displayName,
        updatedAt: profile.updatedAt ?? profile.createdAt,
      });
    }

    return eligible;
  },
});

/** SEO bundle for a public profile — no userId, email, or private settings. */
export const getPublicProfileSeoBundle = query({
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
      .take(40);

    const publicPostCount = posts.filter(
      (post) => !post.deletedAt && post.visibility !== "followers"
    ).length;

    return {
      handle: profile.handle,
      displayName: profile.displayName,
      bio: profile.bio ? truncateDescription(profile.bio, 320) : undefined,
      avatarUrl: profile.avatarUrl,
      publicPostCount,
      canonicalPath: `/gigasocial/profile/${handle}/`,
      updatedAt: profile.updatedAt ?? profile.createdAt,
    };
  },
});

export type MarketplaceSitemapEntry = {
  listingId: Id<"marketplaceListings">;
  title: string;
  updatedAt: number;
};

export type PublicPostSitemapEntry = {
  postId: Id<"socialPosts">;
  title: string;
  updatedAt: number;
};

export type PublicProfileSitemapEntry = {
  handle: string;
  displayName: string;
  updatedAt: number;
};
