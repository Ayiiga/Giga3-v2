/** Clipboard, Web Share, download, and File System Access helpers (PWA-safe). */

import { markdownToSimpleHtml } from "@/lib/chat/chatContentFormat";

export type ShareResult = { ok: true } | { ok: false; reason: string };

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
  const html = markdownToSimpleHtml(markdown);
  try {
    if (
      typeof ClipboardItem !== "undefined" &&
      navigator.clipboard?.write
    ) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([markdown], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return { ok: true };
    }
  } catch {
    /* fall back to plain text */
  }
  return copyTextToClipboard(markdown);
}

export async function shareText(params: {
  title?: string;
  text: string;
  url?: string;
}): Promise<ShareResult> {
  const { title, text, url } = params;
  const trimmed = text.trim();
  if (!trimmed && !url) return { ok: false, reason: "Nothing to share" };

  if (typeof navigator.share === "function") {
    try {
      const payload: ShareData = {};
      if (title) payload.title = title;
      if (trimmed) payload.text = trimmed;
      if (url && !trimmed.includes(url)) payload.url = url;
      else if (url && !trimmed) payload.url = url;
      await navigator.share(payload);
      return { ok: true };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return { ok: false, reason: "Share cancelled" };
      }
    }
  }

  const combined = [title, trimmed, url].filter(Boolean).join("\n\n");
  return copyTextToClipboard(combined);
}

export async function shareFiles(
  files: File[],
  options?: { title?: string; text?: string; url?: string }
): Promise<ShareResult> {
  if (!files.length) return { ok: false, reason: "No files to share" };
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, ...options });
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
    return triggerDownload(
      new Blob([url], { type: "text/plain" }),
      `giga3-${kind}-link.txt`
    );
  }

  try {
    const blob = await fetchAsBlob(url);
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
    const blob = await fetchAsBlob(url);
    const ext = extensionFromMime(blob.type, kind === "video" ? "mp4" : "png");
    const file = new File([blob], `giga3-share.${ext}`, {
      type: blob.type || (kind === "video" ? "video/mp4" : "image/png"),
    });
    const shared = await shareFiles([file], {
      title: `Giga3 AI ${kind}`,
      text: url,
    });
    if (shared.ok) return shared;
    return shareText({ title: `Giga3 AI ${kind}`, text: url });
  } catch {
    return shareText({ title: `Giga3 AI ${kind}`, text: url });
  }
}

export async function copyUrlToClipboard(url: string): Promise<ShareResult> {
  return copyTextToClipboard(url.trim());
}
