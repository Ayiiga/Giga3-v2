/** Clipboard, Web Share, download, and File System Access helpers (PWA-safe). */

import { markdownToSimpleHtml } from "@/lib/chat/chatContentFormat";
import {
  GIGA3_APP_URL,
  GIGA3_ATTRIBUTION_LINE,
  appendGiga3Attribution,
  giga3ShareDefaults,
  prepareImageForGallery,
} from "@/lib/share/giga3Attribution";

export type ShareResult = { ok: true } | { ok: false; reason: string };

export { GIGA3_APP_URL, GIGA3_ATTRIBUTION_LINE, appendGiga3Attribution };

function isSecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}

export async function copyTextToClipboard(text: string): Promise<ShareResult> {
  if (!text.trim()) return { ok: false, reason: "Nothing to copy" };
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    }
  } catch {
    /* fallback below */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok ? { ok: true } : { ok: false, reason: "Copy failed" };
  } catch {
    return { ok: false, reason: "Copy not supported in this browser" };
  }
}

/** Copy markdown as plain + HTML for rich paste in docs and email clients. */
export async function copyMarkdownToClipboard(markdown: string): Promise<ShareResult> {
  if (!markdown.trim()) return { ok: false, reason: "Nothing to copy" };
  const withAttribution = appendGiga3Attribution(markdown);
  const html = markdownToSimpleHtml(withAttribution);
  try {
    if (
      typeof ClipboardItem !== "undefined" &&
      navigator.clipboard?.write
    ) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([withAttribution], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return { ok: true };
    }
  } catch {
    /* fall back to plain text */
  }
  return copyTextToClipboard(withAttribution);
}

export async function shareText(params: {
  title?: string;
  text: string;
  url?: string;
}): Promise<ShareResult> {
  const { title, text, url } = giga3ShareDefaults(params);

  if (typeof navigator.share === "function") {
    try {
      const payload: ShareData = { title, text, url };
      await navigator.share(payload);
      return { ok: true };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return { ok: false, reason: "Share cancelled" };
      }
    }
  }

  return copyTextToClipboard([title, text, url].filter(Boolean).join("\n\n"));
}

export async function shareFiles(
  files: File[],
  options?: { title?: string; text?: string; url?: string }
): Promise<ShareResult> {
  if (!files.length) return { ok: false, reason: "No files to share" };
  const shareMeta = giga3ShareDefaults(options);
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, ...shareMeta });
      return { ok: true };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return { ok: false, reason: "Share cancelled" };
      }
    }
  }
  return {
    ok: false,
    reason: "Sharing files is not supported here — try Save instead",
  };
}

export function triggerDownload(blob: Blob, filename: string): ShareResult {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, reason: "Download failed" };
  }
}

/** Download raster images with a Giga3 watermark for gallery saves. */
export async function triggerAttributedImageDownload(
  blob: Blob,
  filename: string
): Promise<ShareResult> {
  const prepared = await prepareImageForGallery(blob);
  return triggerDownload(prepared, filename);
}

export async function fetchAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Could not fetch media (${res.status})`);
  return res.blob();
}

function extensionFromMime(mime: string, fallback: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  return fallback;
}

export async function saveRemoteMediaToDevice(
  url: string,
  kind: "image" | "video"
): Promise<ShareResult> {
  if (!isSecureContext()) {
    return copyTextToClipboard(appendGiga3Attribution(url));
  }

  try {
    let blob = await fetchAsBlob(url);
    if (kind === "image") {
      blob = await prepareImageForGallery(blob);
    }
    const ext = extensionFromMime(blob.type, kind === "video" ? "mp4" : "png");
    const file = new File([blob], `giga3-${kind}-${Date.now()}.${ext}`, {
      type: blob.type || (kind === "video" ? "video/mp4" : "image/png"),
    });

    const picker = (
      window as Window & {
        showSaveFilePicker?: (options: {
          suggestedName?: string;
          types?: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<FileSystemFileHandle>;
      }
    ).showSaveFilePicker;

    if (picker) {
      try {
        const handle = await picker({
          suggestedName: file.name,
          types: [
            {
              description: kind === "video" ? "Video" : "Image",
              accept: {
                [file.type]: [`.${ext}`],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { ok: true };
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          return { ok: false, reason: "Save cancelled" };
        }
      }
    }

    const fileShare = await shareFiles([file], {
      title: kind === "video" ? "Giga3 AI video" : "Giga3 AI image",
      text:
        kind === "video"
          ? "Video from Giga3 AI"
          : "Image from Giga3 AI",
    });
    if (fileShare.ok) return fileShare;

    return triggerDownload(blob, file.name);
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "Could not save media",
    };
  }
}

export async function shareRemoteMedia(
  url: string,
  kind: "image" | "video"
): Promise<ShareResult> {
  if (!isSecureContext()) {
    return shareText({
      title: `Giga3 AI ${kind}`,
      text: url,
    });
  }
  try {
    let blob = await fetchAsBlob(url);
    if (kind === "image") {
      blob = await prepareImageForGallery(blob);
    }
    const ext = extensionFromMime(blob.type, kind === "video" ? "mp4" : "png");
    const file = new File([blob], `giga3-share.${ext}`, {
      type: blob.type || (kind === "video" ? "video/mp4" : "image/png"),
    });
    const shared = await shareFiles([file], {
      title: `Giga3 AI ${kind}`,
      text: `${kind === "video" ? "Video" : "Image"} from Giga3 AI`,
    });
    if (shared.ok) return shared;
    return shareText({
      title: `Giga3 AI ${kind}`,
      text: url,
    });
  } catch {
    return shareText({
      title: `Giga3 AI ${kind}`,
      text: url,
    });
  }
}

export async function copyUrlToClipboard(url: string): Promise<ShareResult> {
  return copyTextToClipboard(appendGiga3Attribution(url.trim()));
}
