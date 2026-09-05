import { buildGigaSocialShareCopy } from "@/lib/gigasocial/ogMeta";
import type { SocialPost } from "@/lib/gigasocial/types";
import { copyTextToClipboard, type ShareResult } from "@/lib/share/clientShare";

/**
 * Share a GigaSocial post as a link so WhatsApp, Facebook, and other apps
 * render a rich preview card (thumbnail, title, creator) on giga3ai.com.
 */
export async function shareGigaSocialPost(post: SocialPost): Promise<ShareResult> {
  const { title, text, url } = buildGigaSocialShareCopy(post);

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return { ok: true };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return { ok: false, reason: "Share cancelled" };
      }
    }
  }

  return copyTextToClipboard([title, text, url].filter(Boolean).join("\n\n"));
}
