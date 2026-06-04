/** Client-side download / share helpers (no server changes). */

export type DownloadProgress = {
  phase: "idle" | "loading" | "success" | "error";
  percent: number;
  message: string;
};

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

export async function fetchRemoteBlob(
  url: string,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Could not download file");

  const length = res.headers.get("content-length");
  const total = length ? Number.parseInt(length, 10) : 0;
  if (!res.body || !total || !onProgress) {
    onProgress?.(100);
    return res.blob();
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress(Math.min(99, Math.round((received / total) * 100)));
    }
  }

  onProgress(100);
  return new Blob(chunks, { type: res.headers.get("content-type") ?? undefined });
}

async function trySaveWithFilePicker(
  blob: Blob,
  filename: string,
  mimeType: string
): Promise<{ saved: boolean; cancelled: boolean }> {
  const picker = (
    window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName?: string;
        types?: { description: string; accept: Record<string, string[]> }[];
      }) => Promise<FileSystemFileHandle>;
    }
  ).showSaveFilePicker;

  if (!picker) return { saved: false, cancelled: false };

  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  try {
    const handle = await picker({
      suggestedName: filename,
      types: [
        {
          description: mimeType,
          accept: { [mimeType]: ext ? [ext] : [] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { saved: true, cancelled: false };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { saved: false, cancelled: true };
    }
    return { saved: false, cancelled: false };
  }
}

export async function downloadRemoteFile(
  url: string,
  filename: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const blob = await fetchRemoteBlob(url, onProgress);
  const picked = await trySaveWithFilePicker(blob, filename, blob.type);
  if (picked.saved) return;
  if (picked.cancelled) throw new Error("Save cancelled");

  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerDownload(objectUrl, filename);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Mobile-friendly save: File Picker → Web Share files → download fallback. */
export async function saveToGallery(options: {
  url: string;
  filename: string;
  mimeType: string;
  onProgress?: (percent: number) => void;
}): Promise<{ method: "picker" | "share" | "download"; message: string }> {
  const { url, filename, mimeType, onProgress } = options;
  const blob = await fetchRemoteBlob(url, onProgress);
  const file = new File([blob], filename, { type: mimeType || blob.type });

  const picked = await trySaveWithFilePicker(blob, filename, mimeType || blob.type);
  if (picked.saved) {
    return { method: "picker", message: "Saved to your chosen location" };
  }
  if (picked.cancelled) throw new Error("Save cancelled");

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: filename, files: [file] });
      return { method: "share", message: "Saved — check Photos or your share target" };
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new Error("Save cancelled");
      }
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerDownload(objectUrl, filename);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  return {
    method: "download",
    message: "Downloaded — open Downloads or Files to add to gallery",
  };
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

export async function shareText(title: string, text: string): Promise<boolean> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return false;
      throw e;
    }
  }
  await copyTextToClipboard(text);
  return true;
}

export async function shareRemoteMedia(options: {
  title: string;
  url: string;
  filename: string;
  mimeType: string;
  onProgress?: (percent: number) => void;
}): Promise<boolean> {
  const { title, url, filename, mimeType, onProgress } = options;
  const blob = await fetchRemoteBlob(url, onProgress);
  const file = new File([blob], filename, { type: mimeType || blob.type });

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return false;
    }
  }

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text: url, url });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return false;
    }
  }

  await copyTextToClipboard(url);
  return true;
}
