const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const DATA_IMAGE_MD_RE = /!\[[^\]]*\]\((data:image\/[^)]+)\)/gi;
const DATA_IMAGE_RAW_RE = /(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+)/gi;

const IMAGE_PATH = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?[^\s]*)?$/i;
const VIDEO_PATH = /\.(mp4|webm|mov|m4v)(\?[^\s]*)?$/i;

export interface ParsedMessageMedia {
  text: string;
  images: string[];
  videos: string[];
}

function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls.map((u) => u.replace(/[.,;:!?)]+$/, "")))];
}

function classifyUrl(url: string): "image" | "video" | null {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    if (IMAGE_PATH.test(path)) return "image";
    if (VIDEO_PATH.test(path)) return "video";
    // Convex file storage serves generated media without a file extension
    // (e.g. https://<deployment>.convex.cloud/api/storage/<id>). Chat image
    // generation stores images here, so treat storage URLs as images.
    if (/\.convex\.(cloud|site)$/i.test(u.hostname) && /\/(api\/)?storage\//i.test(u.pathname)) {
      return u.pathname.includes("video") ? "video" : "image";
    }
    if (/fal\.media|replicate\.delivery|cdn\.|storage\.googleapis/i.test(u.hostname)) {
      if (path.includes("video") || u.pathname.endsWith(".mp4")) return "video";
      return "image";
    }
  } catch {
    return null;
  }
  return null;
}

/** Split assistant/user text into prose and direct media URLs. */
export function parseMessageMedia(content: unknown): ParsedMessageMedia {
  const text = typeof content === "string" ? content : content == null ? "" : String(content);
  const urls = uniqueUrls(text.match(URL_RE) ?? []);
  const markdownDataImages = uniqueUrls(
    [...text.matchAll(DATA_IMAGE_MD_RE)].map((m) => m[1].trim())
  );
  const rawDataImages = uniqueUrls(
    [...text.matchAll(DATA_IMAGE_RAW_RE)].map((m) => m[1].trim())
  );
  const images: string[] = [];
  const videos: string[] = [];

  for (const url of [...markdownDataImages, ...rawDataImages, ...urls]) {
    if (url.startsWith("data:image/")) {
      images.push(url);
      continue;
    }
    const kind = classifyUrl(url);
    if (kind === "image") images.push(url);
    else if (kind === "video") videos.push(url);
  }

  let prose = text;
  for (const match of text.matchAll(DATA_IMAGE_MD_RE)) {
    prose = prose.replace(match[0], "");
  }
  for (const url of [...images, ...videos]) {
    if (!url.startsWith("data:image/")) {
      prose = prose.split(url).join("");
    }
  }
  prose = prose.replace(/\n{3,}/g, "\n\n").trim();

  return { text: prose, images: uniqueUrls(images), videos };
}

/** Last image URL in chat history (newest assistant/user message wins). */
export function findLatestImageUrlInMessages(
  messages: { content: string }[]
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const { images } = parseMessageMedia(messages[i].content);
    if (images[0]) return images[0];
  }
  return undefined;
}
