import { buildGigaSocialOgDescription, buildGigaSocialOgTitle } from "@/lib/gigasocial/ogMeta";
import { splitPostDisplay } from "@/lib/gigasocial/postDisplay";

const BUILD_LISTING_LIMIT = 200;
const BUILD_POST_LIMIT = 120;
const BUILD_PROFILE_LIMIT = 120;
const PLACEHOLDER_LISTING = "__build_placeholder__";
const PLACEHOLDER_POST = "__build_placeholder__";
const PLACEHOLDER_PROFILE = "__build_placeholder__";

function convexUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, "").trim();
  return raw || null;
}

async function convexQuery<T>(queryPath: string, args: Record<string, unknown> = {}): Promise<T | null> {
  const url = convexUrl();
  if (!url) return null;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: queryPath, args, format: "json" }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload.status === "error") return null;
    return payload.value as T;
  } catch {
    return null;
  }
}

type MarketplaceListingRow = {
  _id: string;
  title: string;
  description: string;
  priceGhs: number;
  category: string;
  coverImageUrl?: string;
  creator?: { displayName: string; handle: string; verified: boolean } | null;
};

type MarketplaceListingBundle = {
  listing: {
    title: string;
    description: string;
    priceGhs: number;
    category: string;
    coverImageUrl?: string;
  };
  description: string;
  creator: { displayName: string; handle: string; verified: boolean } | null;
  reviewCount: number;
  ratingValue?: number;
};

type PublicPostRow = {
  _id: string;
  body: string;
  createdAt: number;
  author: { displayName: string; handle: string; avatarUrl?: string };
};

type PublicPostBundle = {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  headline?: string | null;
  bodyPreview: string;
  createdAt: number;
  author: { displayName: string; handle: string };
};

type PublicProfileBundle = {
  handle: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  publicPostCount: number;
};

export async function fetchMarketplaceListingIds(): Promise<string[]> {
  const fromSeo = await convexQuery<Array<{ listingId: string }>>(
    "publicSeo:listMarketplaceSitemapEntries",
    { limit: BUILD_LISTING_LIMIT }
  );
  if (fromSeo?.length) {
    return fromSeo.map((row) => String(row.listingId));
  }

  const listings = await convexQuery<MarketplaceListingRow[]>("marketplace:searchListings", {
    limit: BUILD_LISTING_LIMIT,
  });
  const ids = listings?.map((row) => String(row._id)) ?? [];
  return ids.length ? ids : [PLACEHOLDER_LISTING];
}

export async function fetchMarketplaceSeoBundle(
  listingId: string
): Promise<MarketplaceListingBundle | null> {
  if (listingId === PLACEHOLDER_LISTING) return null;

  const fromSeo = await convexQuery<MarketplaceListingBundle>("publicSeo:getMarketplaceSeoBundle", {
    listingId,
  });
  if (fromSeo) return fromSeo;

  const data = await convexQuery<{
    listing: MarketplaceListingRow;
    creator: MarketplaceListingBundle["creator"];
    reviews: Array<{ rating: number }>;
  }>("marketplace:getListing", { listingId });

  if (!data?.listing) return null;

  const ratings = data.reviews?.map((review) => review.rating).filter((n) => n >= 1 && n <= 5) ?? [];
  const reviewCount = ratings.length;
  const ratingValue =
    reviewCount > 0
      ? Math.round((ratings.reduce((sum, n) => sum + n, 0) / reviewCount) * 10) / 10
      : undefined;

  const description = data.listing.description.replace(/\s+/g, " ").trim().slice(0, 320);

  return {
    listing: {
      title: data.listing.title,
      description: data.listing.description,
      priceGhs: data.listing.priceGhs,
      category: data.listing.category,
      coverImageUrl: data.listing.coverImageUrl,
    },
    description,
    creator: data.creator,
    reviewCount,
    ratingValue,
  };
}

export async function fetchPublicPostIds(): Promise<string[]> {
  const fromSeo = await convexQuery<Array<{ postId: string }>>(
    "publicSeo:listPublicPostSitemapEntries",
    { limit: BUILD_POST_LIMIT }
  );
  if (fromSeo?.length) {
    return fromSeo.map((row) => String(row.postId));
  }

  const feed = await convexQuery<{ posts: PublicPostRow[] }>("gigaSocial:listFeed", {
    limit: BUILD_POST_LIMIT,
  });
  const ids = feed?.posts?.map((post) => String(post._id)) ?? [];
  return ids.length ? ids : [PLACEHOLDER_POST];
}

export async function fetchPublicPostSeoBundle(postId: string): Promise<PublicPostBundle | null> {
  if (postId === PLACEHOLDER_POST) return null;

  const fromSeo = await convexQuery<PublicPostBundle & { imageUrl: string; imageAlt: string }>(
    "publicSeo:getPublicPostSeoBundle",
    { postId }
  );
  if (fromSeo) return fromSeo;

  const post = await convexQuery<PublicPostRow & { mediaUrl?: string; videoThumbnailUrl?: string }>(
    "gigaSocial:getPublicPost",
    { postId }
  );
  if (!post) return null;

  const display = splitPostDisplay(post.body);
  const title = buildGigaSocialOgTitle(post as never);
  const description = buildGigaSocialOgDescription(post as never);

  return {
    title,
    description,
    imageUrl: post.videoThumbnailUrl ?? post.mediaUrl ?? "/images/logo.png",
    imageAlt: `${post.author.displayName} on GigaSocial`,
    headline: display.title,
    bodyPreview: display.description.slice(0, 500),
    createdAt: post.createdAt,
    author: {
      displayName: post.author.displayName,
      handle: post.author.handle,
    },
  };
}

export async function fetchPublicProfileHandles(): Promise<string[]> {
  const fromSeo = await convexQuery<Array<{ handle: string }>>(
    "publicSeo:listPublicProfileSitemapEntries",
    { limit: BUILD_PROFILE_LIMIT }
  );
  if (fromSeo?.length) {
    return fromSeo.map((row) => row.handle);
  }

  const feed = await convexQuery<{ posts: PublicPostRow[] }>("gigaSocial:listFeed", {
    limit: BUILD_PROFILE_LIMIT,
  });
  const handles = new Set<string>();
  for (const post of feed?.posts ?? []) {
    if (post.author?.handle) handles.add(post.author.handle.toLowerCase());
  }
  const list = [...handles];
  return list.length ? list : [PLACEHOLDER_PROFILE];
}

export async function fetchPublicProfileSeoBundle(handle: string): Promise<PublicProfileBundle | null> {
  if (handle === PLACEHOLDER_PROFILE) return null;

  const fromSeo = await convexQuery<PublicProfileBundle>("publicSeo:getPublicProfileSeoBundle", {
    handle,
  });
  if (fromSeo) return fromSeo;

  const data = await convexQuery<{
    profile: {
      displayName: string;
      handle: string;
      bio?: string;
      avatarUrl?: string;
    };
    posts: Array<{ visibility?: string; deletedAt?: number }>;
  }>("gigaSocial:getProfileByHandle", { handle });

  if (!data?.profile) return null;

  const publicPostCount = (data.posts ?? []).filter(
    (post) => !post.deletedAt && post.visibility !== "followers"
  ).length;

  return {
    handle: data.profile.handle,
    displayName: data.profile.displayName,
    bio: data.profile.bio,
    avatarUrl: data.profile.avatarUrl,
    publicPostCount,
  };
}

export async function fetchPublicSeoSitemapData() {
  const [listings, posts, profiles] = await Promise.all([
    convexQuery<Array<{ listingId: string; updatedAt: number }>>(
      "publicSeo:listMarketplaceSitemapEntries",
      { limit: BUILD_LISTING_LIMIT }
    ),
    convexQuery<Array<{ postId: string; updatedAt: number }>>(
      "publicSeo:listPublicPostSitemapEntries",
      { limit: BUILD_POST_LIMIT }
    ),
    convexQuery<Array<{ handle: string; updatedAt: number }>>(
      "publicSeo:listPublicProfileSitemapEntries",
      { limit: BUILD_PROFILE_LIMIT }
    ),
  ]);

  if (listings || posts || profiles) {
    return {
      listings: listings ?? [],
      posts: posts ?? [],
      profiles: profiles ?? [],
    };
  }

  const [listingRows, feed] = await Promise.all([
    convexQuery<MarketplaceListingRow[]>("marketplace:searchListings", {
      limit: BUILD_LISTING_LIMIT,
    }),
    convexQuery<{ posts: PublicPostRow[] }>("gigaSocial:listFeed", { limit: BUILD_POST_LIMIT }),
  ]);

  return {
    listings:
      listingRows?.map((row) => ({
        listingId: row._id,
        updatedAt: Date.now(),
      })) ?? [],
    posts:
      feed?.posts?.map((post) => ({
        postId: post._id,
        updatedAt: post.createdAt,
      })) ?? [],
    profiles: [...new Set((feed?.posts ?? []).map((post) => post.author.handle.toLowerCase()))].map(
      (handle) => ({
        handle,
        updatedAt: Date.now(),
      })
    ),
  };
}
