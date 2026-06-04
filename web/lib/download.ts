/** Client-side download / share helpers (no server changes). */

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

export async function downloadRemoteFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Could not download file");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerDownload(objectUrl, filename);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
}): Promise<boolean> {
  const { title, url, filename, mimeType } = options;
  if (typeof navigator.share !== "function") {
    await copyTextToClipboard(url);
    return true;
  }
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const file = new File([blob], filename, { type: mimeType || blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return true;
    }
    await navigator.share({ title, text: url, url });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return false;
    try {
      await navigator.share({ title, text: url, url });
      return true;
    } catch (inner) {
      if (inner instanceof DOMException && inner.name === "AbortError") return false;
      await copyTextToClipboard(url);
      return true;
    }
  }
}
