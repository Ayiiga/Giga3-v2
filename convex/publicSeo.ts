import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { isListingFileApproved } from "./marketplaceListingHelpers";
import {
  toPublicCreatorProfile,
  toPublicListing,
  toPublicReview,
} from "./marketplaceViews";
import { buildGigaSocialOgMeta } from "./gigaSocialOg";
import {
  normalizeSocialHandle,
  splitPostDisplay,
  toPublicAuthor,
  toPublicPost,
} from "./gigaSocialViews";

const MAX_SITEMAP_LISTINGS = 500;
/** Build-time and crawler SEO bundles for public Marketplace and GigaSocial pages. */
const MAX_SITEMAP_POSTS = 300;
const MAX_SITEMAP_PROFILES = 300;

function truncateDescription(text: string, max = 320): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

/** Published marketplace listings safe for sitemap and static SEO pages. */
export const listMarketplaceSitemapEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? MAX_SITEMAP_LISTINGS, MAX_SITEMAP_LISTINGS);
    const rows = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(cap * 2);

    return rows
      .filter((listing) => isListingFileApproved(listing))
      .slice(0, cap)
      .map((listing) => ({
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

    const publicListing = toPublicListing(listing);
    const ratingValues = reviews.map((r) => r.rating).filter((n) => n >= 1 && n <= 5);
    const reviewCount = ratingValues.length;
    const ratingValue =
      reviewCount > 0
        ? Math.round((ratingValues.reduce((sum, n) => sum + n, 0) / reviewCount) * 10) / 10
        : undefined;

    return {
      listing: publicListing,
      description: truncateDescription(publicListing.description),
      creator: creator ? toPublicCreatorProfile(creator) : null,
      reviewCount,
      ratingValue,
      reviews: reviews.slice(0, 5).map(toPublicReview),
    };
  },
});

/** Public GigaSocial posts for sitemap generation (public visibility only). */
export const listPublicPostSitemapEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cap = Math.min(args.limit ?? MAX_SITEMAP_POSTS, MAX_SITEMAP_POSTS);
    const rows = await ctx.db.query("socialPosts").order("desc").take(cap * 4);

    return rows
      .filter((post) => !post.deletedAt && post.visibility !== "followers")
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
    const profiles = await ctx.db.query("socialProfiles").order("desc").take(cap * 2);

    return profiles
      .filter((profile) => Boolean(normalizeSocialHandle(profile.handle)))
      .slice(0, cap)
      .map((profile) => ({
        handle: normalizeSocialHandle(profile.handle),
        displayName: profile.displayName,
        updatedAt: profile.updatedAt ?? profile.createdAt,
      }));
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
