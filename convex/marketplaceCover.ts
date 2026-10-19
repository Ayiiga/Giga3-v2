import type { Id } from "./_generated/dataModel";

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
 * Resolve a displayable cover URL.
 * Prefer durable coverStorageId → fresh getUrl(); fall back to non-ephemeral coverImageUrl
 * (official CDN / absolute public URLs). Stale signed URLs without a storage id are dropped.
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
  if (isEphemeralConvexStorageUrl(stored)) return undefined;
  return stored.slice(0, 500);
}

/** Pure helper for unit tests — same rules without I/O. */
export function pickStableCoverUrl(input: {
  freshStorageUrl?: string | null;
  coverImageUrl?: string;
}): string | undefined {
  if (input.freshStorageUrl) return input.freshStorageUrl;
  const stored = input.coverImageUrl?.trim();
  if (!stored) return undefined;
  if (isEphemeralConvexStorageUrl(stored)) return undefined;
  return stored;
}
