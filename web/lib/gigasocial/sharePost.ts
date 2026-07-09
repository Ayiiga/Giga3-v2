import { splitPostDisplay } from "@/lib/gigasocial/postDisplay";
import { buildGigaSocialPostUrl } from "@/lib/gigasocial/shareLinks";
import type { SocialPost } from "@/lib/gigasocial/types";
import {
  fetchAsBlob,
  shareText,
  type ShareResult,
} from "@/lib/share/clientShare";
import {
  giga3ShareDefaults,
  prepareImageForGallery,
} from "@/lib/share/giga3Attribution";

function extensionFromMime(mime: string, fallback: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  return fallback;
}

function postShareCopy(post: SocialPost): { title: string; text: string; url: string } {
  const url = buildGigaSocialPostUrl(post._id);
  const display = splitPostDisplay(post.body);
  const excerpt = (display.description || display.title || post.body).slice(0, 200);
  return {
    title: `${post.author.displayName} on GigaSocial — Giga3 AI`,
    text: `${post.author.displayName}: ${excerpt}`,
    url,
  };
}

function primaryMediaUrl(post: SocialPost): string | undefined {
  return post.mediaUrls?.[0] ?? post.mediaUrl;
}

function mediaKind(post: SocialPost): "video" | "image" | null {
  const url = primaryMediaUrl(post);
  if (!url) return null;
  if (post.mediaType === "video" || post.postType === "video") return "video";
  if (
    post.mediaType === "image" ||
    post.mediaType === "gallery" ||
    post.postType === "image"
  ) {
    return "image";
  }
  return null;
}

/**
 * Share a GigaSocial post to other apps with media when supported and a link
 * back to the public post page on GigaSocial.
 */
export async function shareGigaSocialPost(post: SocialPost): Promise<ShareResult> {
  const copy = postShareCopy(post);
  const kind = mediaKind(post);
  const mediaUrl = primaryMediaUrl(post);

  if (kind && mediaUrl && typeof navigator !== "undefined") {
    try {
      let blob = await fetchAsBlob(mediaUrl);
      if (kind === "image") {
        blob = await prepareImageForGallery(blob);
      }
      const ext = extensionFromMime(blob.type, kind === "video" ? "mp4" : "png");
      const file = new File([blob], `gigasocial-${kind}.${ext}`, {
        type: blob.type || (kind === "video" ? "video/mp4" : "image/png"),
      });
      const shareMeta = giga3ShareDefaults(copy);

      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], ...shareMeta });
        return { ok: true };
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return { ok: false, reason: "Share cancelled" };
      }
    }
  }

  return shareText(copy);
}
