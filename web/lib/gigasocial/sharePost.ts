import { buildGigaSocialShareCopy } from "@/lib/gigasocial/ogMeta";
import type { SocialPost } from "@/lib/gigasocial/types";
import { shareText, type ShareResult } from "@/lib/share/clientShare";
import { giga3ShareDefaults } from "@/lib/share/giga3Attribution";

/**
 * Share a GigaSocial post as a link so WhatsApp, Facebook, and other apps
 * render a rich preview card (thumbnail, views/likes, creator).
 */
export async function shareGigaSocialPost(post: SocialPost): Promise<ShareResult> {
  const copy = buildGigaSocialShareCopy(post);
  return shareText(giga3ShareDefaults(copy));
}
