import { buildImageStudioActionUrl } from "@/lib/chat/imageStudioLinks";
import { siteConfig } from "@/lib/site";

/** Deep link into GigaEdit photo tools with a remote image source. */
export function buildGigaEditImageHandoffUrl(imageUrl: string): string {
  const params = new URLSearchParams({
    tab: "photo",
    clip0: imageUrl.trim(),
  });
  return `${siteConfig.links.gigaedit}?${params.toString()}`;
}

/** Open GigaSocial composer for sharing generated media. */
export function buildGigaSocialImageHandoffUrl(imageUrl: string): string {
  const params = new URLSearchParams({
    compose: "post",
    mediaUrl: imageUrl.trim(),
  });
  return `${siteConfig.links.gigasocial}?${params.toString()}`;
}

export function buildChatImageVariationUrl(imageUrl: string): string {
  return buildImageStudioActionUrl("style", imageUrl);
}
