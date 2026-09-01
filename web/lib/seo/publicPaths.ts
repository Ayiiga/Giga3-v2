import { siteConfig } from "@/lib/site";

export function marketplaceItemPath(listingId: string): string {
  return `/marketplace/item/${encodeURIComponent(listingId)}/`;
}

export function marketplaceItemUrl(listingId: string): string {
  return new URL(marketplaceItemPath(listingId), siteConfig.url).toString();
}

export function gigaSocialPostPath(postId: string): string {
  return `/gigasocial/post/${encodeURIComponent(postId)}/`;
}

export function gigaSocialPostUrl(postId: string): string {
  return new URL(gigaSocialPostPath(postId), siteConfig.url).toString();
}

export function gigaSocialProfilePath(handle: string): string {
  const normalized = handle.replace(/^@/, "").trim().toLowerCase();
  return `/gigasocial/profile/${encodeURIComponent(normalized)}/`;
}

export function gigaSocialProfileUrl(handle: string): string {
  return new URL(gigaSocialProfilePath(handle), siteConfig.url).toString();
}
