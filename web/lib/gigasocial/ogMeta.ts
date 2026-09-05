import type { SocialPost } from "@/lib/gigasocial/types";
import { siteConfig } from "@/lib/site";
import { splitPostDisplay } from "@/lib/gigasocial/postDisplay";
import {
  buildGigaSocialOgImageUrl,
  buildGigaSocialPostUrl,
} from "@/lib/gigasocial/shareLinks";

const DEFAULT_OG_IMAGE = `${siteConfig.url.replace(/\/$/, "")}/images/logo.png`;

function hasShareableContent(post: SocialPost): boolean {
  return Boolean(
    post.body.trim() ||
      post.mediaUrl ||
      (post.mediaUrls && post.mediaUrls.length > 0)
  );
}

function isLikelyImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(trimmed)) return false;
  const withoutQuery = trimmed.split(/[?#]/)[0] ?? trimmed;
  if (/\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|#|$)/i.test(withoutQuery)) return true;
  return !/\/video\//i.test(trimmed);
}

function resolveDirectThumbnail(post: SocialPost): string | null {
  const candidates = [
    post.videoThumbnailUrl,
    ...(post.mediaUrls ?? []),
    post.mediaUrl,
  ];
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    const value = candidate.trim();
    if (value.startsWith("data:image/") || isLikelyImageUrl(value)) return value;
  }
  return null;
}

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

export function previewImageUrl(post: SocialPost): string {
  if (!hasShareableContent(post)) return DEFAULT_OG_IMAGE;
  const direct = resolveDirectThumbnail(post);
  if (direct) return direct;
  return buildGigaSocialOgImageUrl(post._id);
}

/** Article-style headline for link previews (WhatsApp, Facebook, etc.). */
export function buildGigaSocialOgTitle(post: SocialPost): string {
  const display = splitPostDisplay(post.body);
  const headline = (display.title || display.description || post.body)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  if (headline) {
    return `${headline} — ${post.author.displayName} on GigaSocial`;
  }
  return `${mediaLabel(post)} by ${post.author.displayName} on GigaSocial`;
}

export function buildGigaSocialOgDescription(post: SocialPost): string {
  const display = splitPostDisplay(post.body);
  const bodyExcerpt = (display.title ? display.description : display.description || post.body)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  const views = post.viewCount ?? 0;
  const likes = post.likeCount ?? 0;
  const stats = `${formatCompactCount(views)} views · ${formatCompactCount(likes)} likes`;
  return [bodyExcerpt, stats].filter(Boolean).join(" · ").slice(0, 240) || `${post.author.displayName} on GigaSocial`;
}

export function buildGigaSocialShareCopy(post: SocialPost): {
  title: string;
  text: string;
  url: string;
} {
  const url = buildGigaSocialPostUrl(post._id);
  const title = buildGigaSocialOgTitle(post);
  const description = buildGigaSocialOgDescription(post);
  return {
    title,
    text: description,
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
