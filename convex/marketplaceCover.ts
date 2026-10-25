import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

type StorageReader = {
  getUrl: (storageId: Id<"_storage">) => Promise<string | null>;
};

type CoverFields = {
  coverStorageId?: Id<"_storage">;
  coverImageUrl?: string;
};

/** Convex signed storage URLs expire — never treat them as durable public CDN links. */
export function isEphemeralConvexStorageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    const path = new URL(trimmed).pathname;
    return (
      (host.endsWith(".convex.cloud") || host.endsWith(".convex.site")) &&
      path.includes("/api/storage/")
    );
  } catch {
    return false;
  }
}

/**
 * Recover a Convex storage id from a signed getUrl() link.
 * Pre-coverStorageId uploads only persisted these ephemeral URLs; the path segment
 * after `/api/storage/` is still a valid Id<"_storage"> for storage.getUrl().
 */
export function extractConvexStorageIdFromUrl(
  url: string
): Id<"_storage"> | undefined {
  const trimmed = url.trim();
  if (!trimmed || !isEphemeralConvexStorageUrl(trimmed)) return undefined;
  try {
    const path = new URL(trimmed).pathname;
    const marker = "/api/storage/";
    const idx = path.toLowerCase().indexOf(marker);
    if (idx < 0) return undefined;
    const raw = path.slice(idx + marker.length).split("/").filter(Boolean)[0];
    if (!raw) return undefined;
    // Storage ids are opaque tokens (legacy UUID or modern Convex document ids).
    if (!/^[A-Za-z0-9_-]{8,200}$/.test(raw)) return undefined;
    return raw as Id<"_storage">;
  } catch {
    return undefined;
  }
}

/**
 * Resolve a displayable cover URL.
 * Prefer durable coverStorageId → fresh getUrl(); recover storage id from a stale
 * signed coverImageUrl when present; then fall back to non-ephemeral coverImageUrl
 * (official CDN / absolute public URLs). Stale signed URLs without a recoverable
 * storage id are dropped.
 */
export async function resolveListingCoverUrl(
  storage: StorageReader,
  listing: CoverFields
): Promise<string | undefined> {
  if (listing.coverStorageId) {
    const fresh = await storage.getUrl(listing.coverStorageId);
    if (fresh) return fresh;
  }

  const stored = listing.coverImageUrl?.trim();
  if (!stored) return undefined;

  if (isEphemeralConvexStorageUrl(stored)) {
    const recoveredId = extractConvexStorageIdFromUrl(stored);
    if (recoveredId) {
      const fresh = await storage.getUrl(recoveredId);
      if (fresh) return fresh;
    }
    return undefined;
  }

  return stored.slice(0, 500);
}

/** Pure helper for unit tests — same rules without I/O. */
export function pickStableCoverUrl(input: {
  freshStorageUrl?: string | null;
  recoveredFromEphemeralUrl?: string | null;
  coverImageUrl?: string;
}): string | undefined {
  if (input.freshStorageUrl) return input.freshStorageUrl;
  if (input.recoveredFromEphemeralUrl) return input.recoveredFromEphemeralUrl;
  const stored = input.coverImageUrl?.trim();
  if (!stored) return undefined;
  if (isEphemeralConvexStorageUrl(stored)) return undefined;
  return stored;
}

/** True when a listing has a durable cover (storage blob or non-ephemeral URL). */
export function hasDurableCover(listing: CoverFields): boolean {
  if (listing.coverStorageId) return true;
  const stored = listing.coverImageUrl?.trim();
  if (!stored) return false;
  return !isEphemeralConvexStorageUrl(stored);
}

/**
 * Latest approved/uploaded cover intent storage id for a listing.
 * Used for read-time recovery when coverStorageId was never written.
 */
export async function coverIntentStorageIdForListing(
  ctx: Pick<QueryCtx, "db">,
  listingId: Id<"marketplaceListings">
): Promise<Id<"_storage"> | undefined> {
  const intents = await ctx.db
    .query("marketplaceUploadIntents")
    .withIndex("by_listing", (q) => q.eq("listingId", listingId))
    .order("desc")
    .take(30);
  const cover = intents.find(
    (intent) =>
      intent.purpose === "cover_image" &&
      intent.storageId &&
      (intent.status === "approved" || intent.status === "uploaded")
  );
  return cover?.storageId;
}
