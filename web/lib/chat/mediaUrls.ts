const IMAGE_URL =
  /(https?:\/\/[^\s<>"']+\.(?:png|jpe?g|webp|gif)(?:\?[^\s<>"']*)?)/gi;
const VIDEO_URL =
  /(https?:\/\/[^\s<>"']+\.(?:mp4|webm|mov)(?:\?[^\s<>"']*)?)/gi;

function uniqueMatches(pattern: RegExp, content: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags);
  while ((match = re.exec(content)) !== null) {
    const url = match[1];
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

export function extractMediaUrls(content: string): {
  images: string[];
  videos: string[];
} {
  return {
    images: uniqueMatches(IMAGE_URL, content),
    videos: uniqueMatches(VIDEO_URL, content),
  };
}
