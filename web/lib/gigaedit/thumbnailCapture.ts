/** Capture a JPEG thumbnail from a video File (for media library). */

export async function captureFileThumbnail(
  file: File,
  atSec = 0.1
): Promise<string | undefined> {
  if (typeof document === "undefined") return undefined;
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.playsInline = true;
  video.muted = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not load video for thumbnail."));
    });
    video.currentTime = Math.min(atSec, Math.max(0, (video.duration || 1) - 0.05));
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      window.setTimeout(resolve, 400);
    });
    const w = Math.min(320, video.videoWidth || 320);
    const h = Math.min(180, video.videoHeight || 180);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

export async function captureVideoElementThumbnail(
  video: HTMLVideoElement
): Promise<string | undefined> {
  if (video.readyState < 2) return undefined;
  try {
    const w = Math.min(320, video.videoWidth || 320);
    const h = Math.min(180, video.videoHeight || 180);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}
