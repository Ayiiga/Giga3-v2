import type { PublicSocialAuthor, PublicSocialPost } from "./gigaSocialViews";
import { parseMediaMetaJson } from "./gigaSocialViews";

const DEFAULT_ORIGIN = "https://www.giga3ai.com";
const DEFAULT_OG_IMAGE = `${DEFAULT_ORIGIN}/images/logo.png`;

export type GigaSocialOgMeta = {
  canonicalUrl: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  siteName: string;
  type: "website" | "video.other" | "article";
  videoUrl?: string;
  videoDurationSec?: number;
};

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

function splitPostDisplay(body: string): { title: string | null; description: string } {
  const trimmed = body.trim();
  if (!trimmed) return { title: null, description: "" };

  const lines = trimmed.split("\n");
  const firstLine = lines[0]?.trim() ?? "";

  const markdownHeading = firstLine.match(/^#{1,2}\s+(.+)$/);
  if (markdownHeading) {
    const rest = lines.slice(1).join("\n").trim();
    return {
      title: markdownHeading[1].replace(/^\*\*(.+)\*\*$/, "$1").trim(),
      description: rest || trimmed,
    };
  }

  if (lines.length >= 2 && firstLine.length >= 3 && firstLine.length <= 100) {
    const rest = lines.slice(1).join("\n").trim();
    if (rest.length > 0) {
      return { title: firstLine.replace(/^\*\*(.+)\*\*$/, "$1").trim(), description: rest };
    }
  }

  return { title: null, description: trimmed };
}

function mediaLabel(post: PublicSocialPost): string {
  if (post.mediaType === "video" || post.postType === "video") return "Video";
  if (post.mediaType === "gallery") return "Gallery";
  if (post.mediaType === "image" || post.postType === "image") return "Photo";
  return "Post";
}

function primaryMediaUrl(post: PublicSocialPost): string | undefined {
  return post.mediaUrls?.[0] ?? post.mediaUrl;
}

function previewImageUrl(post: PublicSocialPost, mediaMetaJson?: string | null): string {
  if (post.videoThumbnailUrl) return post.videoThumbnailUrl;

  const mediaItems = parseMediaMetaJson(mediaMetaJson);
  const videoThumb = mediaItems.find((item) => item.type === "video" && item.thumbnailUrl)
    ?.thumbnailUrl;
  if (videoThumb) return videoThumb;

  const imageFromMeta = mediaItems.find((item) => item.type === "image")?.url;
  if (imageFromMeta) return imageFromMeta;

  const mediaUrl = primaryMediaUrl(post);
  if (mediaUrl && post.mediaType !== "video" && post.postType !== "video") {
    return mediaUrl;
  }

  return DEFAULT_OG_IMAGE;
}

export function buildGigaSocialPostUrl(postId: string, origin?: string): string {
  const base = (origin ?? process.env.FRONTEND_URL ?? DEFAULT_ORIGIN).replace(/\/$/, "");
  return `${base}/gigasocial/post/?id=${encodeURIComponent(postId)}`;
}

export function buildGigaSocialOgMeta(
  post: PublicSocialPost,
  origin?: string,
  mediaMetaJson?: string | null
): GigaSocialOgMeta {
  const display = splitPostDisplay(post.body);
  const views = post.viewCount ?? 0;
  const likes = post.likeCount ?? 0;
  const label = mediaLabel(post);
  const author = post.author.displayName;
  const title = `${formatCompactCount(views)} views • ${formatCompactCount(likes)} likes | ${label} by ${author}`;
  const excerpt = (display.title || display.description || post.body).replace(/\s+/g, " ").trim();
  const description = excerpt.slice(0, 240);
  const canonicalUrl = buildGigaSocialPostUrl(String(post._id), origin);
  const imageUrl = previewImageUrl(post, mediaMetaJson);
  const videoUrl =
    post.mediaType === "video" || post.postType === "video"
      ? primaryMediaUrl(post)
      : undefined;

  return {
    canonicalUrl,
    title,
    description: description || `${author} shared on GigaSocial`,
    imageUrl,
    imageAlt: display.title || `${label} by ${author} on GigaSocial`,
    siteName: "GigaSocial",
    type: videoUrl ? "video.other" : "article",
    videoUrl,
    videoDurationSec: post.videoDurationSec,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metaTag(property: string, content: string): string {
  return `<meta property="${escapeHtml(property)}" content="${escapeHtml(content)}" />`;
}

function nameMetaTag(name: string, content: string): string {
  return `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}" />`;
}

export function renderGigaSocialPreviewHtml(
  meta: GigaSocialOgMeta,
  author?: PublicSocialAuthor
): string {
  const tags = [
    `<meta charset="utf-8" />`,
    `<title>${escapeHtml(meta.title)}</title>`,
    metaTag("og:title", meta.title),
    metaTag("og:description", meta.description),
    metaTag("og:image", meta.imageUrl),
    metaTag("og:image:secure_url", meta.imageUrl),
    metaTag("og:image:alt", meta.imageAlt),
    metaTag("og:url", meta.canonicalUrl),
    metaTag("og:type", meta.type),
    metaTag("og:site_name", meta.siteName),
    nameMetaTag("twitter:card", "summary_large_image"),
    nameMetaTag("twitter:title", meta.title),
    nameMetaTag("twitter:description", meta.description),
    nameMetaTag("twitter:image", meta.imageUrl),
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`,
  ];

  if (meta.videoUrl) {
    tags.push(metaTag("og:video", meta.videoUrl));
    tags.push(metaTag("og:video:secure_url", meta.videoUrl));
    tags.push(metaTag("og:video:type", "video/mp4"));
    if (meta.videoDurationSec && meta.videoDurationSec > 0) {
      tags.push(metaTag("og:video:duration", String(Math.round(meta.videoDurationSec))));
    }
  }

  if (author?.displayName) {
    tags.push(metaTag("article:author", author.displayName));
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    ${tags.join("\n    ")}
  </head>
  <body>
    <p><a href="${escapeHtml(meta.canonicalUrl)}">View on GigaSocial</a></p>
  </body>
</html>`;
}

export function renderGigaSocialUnavailableHtml(postId: string, origin?: string): string {
  const canonicalUrl = buildGigaSocialPostUrl(postId, origin);
  const title = "Post unavailable on GigaSocial";
  const description = "This GigaSocial post was removed or is not publicly available.";
  return renderGigaSocialPreviewHtml({
    canonicalUrl,
    title,
    description,
    imageUrl: DEFAULT_OG_IMAGE,
    imageAlt: "GigaSocial on Giga3 AI",
    siteName: "GigaSocial",
    type: "website",
  });
}
