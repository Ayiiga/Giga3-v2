/** Attach the original post media to a remix composition (client-side). */

import { getPostAudioUrl, getPostMediaKind, getPostMediaUrls } from "@/lib/gigasocial/postMedia";
import type { SocialPost } from "@/lib/gigasocial/types";
import type { GigaRemixModeId } from "@/lib/gigasocial/remixMeta";

export type RemixAttachedMedia = {
  video?: File;
  images?: File[];
  audio?: File;
  videoDurationSec?: number;
  soundAttribution?: string;
};

function extensionForMime(mime: string, fallback: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("m4a")) return "m4a";
  return fallback;
}

async function fetchAsFile(
  url: string,
  baseName: string,
  fallbackExt: string
): Promise<File | null> {
  try {
    const response = await fetch(url, {
      credentials: "omit",
      cache: "force-cache",
      mode: "cors",
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.size) return null;
    const mime = blob.type || "application/octet-stream";
    const ext = extensionForMime(mime, fallbackExt);
    return new File([blob], `${baseName}.${ext}`, {
      type: mime === "application/octet-stream" ? undefined : mime,
      lastModified: Date.now(),
    });
  } catch {
    return null;
  }
}

function probeVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    video.src = url;
  });
}

/** Modes that must keep the original clip in the remix composition. */
export function remixModeNeedsSourceVideo(mode: GigaRemixModeId): boolean {
  return (
    mode === "classic" ||
    mode === "split-view" ||
    mode === "reaction" ||
    mode === "voice-over" ||
    mode === "green-screen" ||
    mode === "clip-reply" ||
    mode === "continue-story" ||
    mode === "trend-template" ||
    mode === "ai-subtitles"
  );
}

export function remixModeNeedsSourceAudio(mode: GigaRemixModeId): boolean {
  return mode === "sound-reuse" || mode === "voice-over";
}

/**
 * Download the source post's media so remix keeps the original video/audio attached.
 */
export async function attachRemixSourceMedia(
  post: SocialPost,
  mode: GigaRemixModeId
): Promise<RemixAttachedMedia> {
  const kind = getPostMediaKind(post);
  const result: RemixAttachedMedia = {};
  const id = post._id.slice(-8);

  if (remixModeNeedsSourceVideo(mode) && (kind === "video" || post.videoDurationSec)) {
    const url = getPostMediaUrls(post)[0];
    if (url) {
      const file = await fetchAsFile(url, `giga-remix-source-${id}`, "mp4");
      if (file) {
        result.video = file;
        result.videoDurationSec =
          post.videoDurationSec ?? (await probeVideoDuration(file));
      }
    }
  }

  if (
    !result.video &&
    (kind === "image" || kind === "gallery" || kind === "photo-music")
  ) {
    const urls = getPostMediaUrls(post).slice(0, 4);
    const images: File[] = [];
    for (let i = 0; i < urls.length; i += 1) {
      const file = await fetchAsFile(urls[i]!, `giga-remix-img-${id}-${i}`, "jpg");
      if (file) images.push(file);
    }
    if (images.length) result.images = images;
  }

  if (remixModeNeedsSourceAudio(mode) || kind === "photo-music") {
    const audioUrl = getPostAudioUrl(post);
    if (audioUrl) {
      const file = await fetchAsFile(audioUrl, `giga-remix-audio-${id}`, "mp3");
      if (file) {
        result.audio = file;
        result.soundAttribution = `@${post.author.handle} · original sound`;
      }
    }
  }

  return result;
}
