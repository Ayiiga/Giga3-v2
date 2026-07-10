import type { SocialPost } from "@/lib/gigasocial/types";
import { siteConfig } from "@/lib/site";
import { splitPostDisplay } from "@/lib/gigasocial/postDisplay";
import { buildGigaSocialSharePreviewUrl } from "@/lib/gigasocial/shareLinks";

const DEFAULT_OG_IMAGE = `${siteConfig.url.replace(/\/$/, "")}/images/logo.png`;

export function formatCompactCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000;
    return scaled >= 10
      ? `${Math.round(scaled)}M`
      : `${scaled.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) {
    const scaled = value / 1_000;
    return scaled >= 10
      ? `${Math.round(scaled)}K`
      : `${scaled.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(Math.round(value));
}

function mediaLabel(post: SocialPost): string {
  if (post.mediaType === "video" || post.postType === "video") return "Video";
  if (post.mediaType === "gallery") return "Gallery";
  if (post.mediaType === "image" || post.postType === "image") return "Photo";
  return "Post";
}

function primaryMediaUrl(post: SocialPost): string | undefined {
  return post.mediaUrls?.[0] ?? post.mediaUrl;
}

export function previewImageUrl(post: SocialPost): string {
  if (post.videoThumbnailUrl) return post.videoThumbnailUrl;
  const mediaUrl = primaryMediaUrl(post);
  if (mediaUrl && post.mediaType !== "video" && post.postType !== "video") {
    return mediaUrl;
  }
  return DEFAULT_OG_IMAGE;
}

/** Facebook / WhatsApp-style preview title: views • likes | type by author */
export function buildGigaSocialOgTitle(post: SocialPost): string {
  const views = post.viewCount ?? 0;
  const likes = post.likeCount ?? 0;
  const label = mediaLabel(post);
  return `${formatCompactCount(views)} views • ${formatCompactCount(likes)} likes | ${label} by ${post.author.displayName}`;
}

export function buildGigaSocialOgDescription(post: SocialPost): string {
  const display = splitPostDisplay(post.body);
  const excerpt = (display.title || display.description || post.body).replace(/\s+/g, " ").trim();
  return excerpt.slice(0, 240) || `${post.author.displayName} shared on GigaSocial`;
}

export function buildGigaSocialShareCopy(post: SocialPost): {
  title: string;
  text: string;
  url: string;
} {
  const url = buildGigaSocialSharePreviewUrl(post._id);
  const title = buildGigaSocialOgTitle(post);
  const description = buildGigaSocialOgDescription(post);
  return {
    title,
    text: `${title}\n${description}`,
    url,
  };
}

export function formatVideoDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
