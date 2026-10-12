/**
 * Pure helpers for building / validating OneSignal notification payloads
 * for published Giga3 AI blog articles. Used by tests and (future) server senders.
 *
 * Sending requires a server-side REST API key — never call OneSignal create-
 * notification from the browser or static export.
 */

import {
  buildBlogArticleNotificationUrl,
  isApprovedBlogNotificationUrl,
} from "@/lib/blog/blogPushConfig";

export type BlogPushArticleInput = {
  slug: string;
  title: string;
  /** Short summary shown in the notification body */
  summary: string;
  /** Absolute or site-relative image URL */
  imageUrl?: string;
  siteOrigin?: string;
};

export type BlogPushNotificationPayload = {
  headings: { en: string };
  contents: { en: string };
  url: string;
  chrome_web_image?: string;
  firefox_icon?: string;
  chrome_web_icon?: string;
  /** Idempotency / de-dupe key for a given article publish event */
  external_id?: string;
  data: {
    type: "giga3_blog_article";
    slug: string;
    brand: "Giga3 AI";
  };
};

const MAX_TITLE = 80;
const MAX_SUMMARY = 140;

function clip(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

function absolutizeImage(imageUrl: string | undefined, siteOrigin: string): string | undefined {
  if (!imageUrl) return undefined;
  try {
    const url = new URL(imageUrl, siteOrigin);
    if (url.protocol !== "https:") return undefined;
    // Prefer same-site assets; allow https images only.
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Build a OneSignal-compatible notification body for a published article.
 * Returns null when the URL fails the approved-domain check.
 */
export function buildBlogArticlePushPayload(
  input: BlogPushArticleInput
): BlogPushNotificationPayload | null {
  const siteOrigin = input.siteOrigin ?? "https://www.giga3ai.com";
  const url = buildBlogArticleNotificationUrl(input.slug, siteOrigin);
  if (!isApprovedBlogNotificationUrl(url, siteOrigin)) return null;

  const title = clip(input.title, MAX_TITLE);
  const summary = clip(input.summary || input.title, MAX_SUMMARY);
  const image = absolutizeImage(input.imageUrl, siteOrigin);

  const payload: BlogPushNotificationPayload = {
    headings: { en: title },
    contents: { en: summary },
    url,
    data: {
      type: "giga3_blog_article",
      slug: input.slug.replace(/^\/+|\/+$/g, ""),
      brand: "Giga3 AI",
    },
    external_id: `blog:${input.slug.replace(/^\/+|\/+$/g, "")}`,
  };

  if (image) {
    payload.chrome_web_image = image;
    payload.chrome_web_icon = `${siteOrigin}/icons/icon-192.png`;
    payload.firefox_icon = `${siteOrigin}/icons/icon-192.png`;
  }

  return payload;
}

/** In-memory / store key for duplicate-send prevention per article slug. */
export function blogPushDedupeKey(slug: string): string {
  return `blog-push-sent:${slug.replace(/^\/+|\/+$/g, "")}`;
}

/**
 * Decide whether a send should proceed given prior send records.
 * Only published editorial posts should be passed in by the caller.
 */
export function shouldSendBlogPush(args: {
  slug: string;
  previouslySentKeys: Iterable<string>;
  isDraft?: boolean;
  isPreview?: boolean;
}): boolean {
  if (args.isDraft || args.isPreview) return false;
  const key = blogPushDedupeKey(args.slug);
  for (const existing of args.previouslySentKeys) {
    if (existing === key) return false;
  }
  return true;
}
