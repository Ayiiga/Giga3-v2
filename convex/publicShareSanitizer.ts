/**
 * Strip embedded image data and attachment metadata from messages exposed via
 * public share links.
 */

const DATA_URL_IMAGE_MD = /!\[([^\]]*)\]\(data:image\/[^)]+\)/gi;
const DATA_URL_IMAGE_BARE = /data:image\/[a-z0-9+.-]+;base64,[a-z0-9+/=\s]+/gi;

export function sanitizePublicShareMessageContent(content: string): string {
  let out = content;
  out = out.replace(DATA_URL_IMAGE_MD, "![$1](shared image)");
  out = out.replace(DATA_URL_IMAGE_BARE, "[shared image]");
  return out;
}
