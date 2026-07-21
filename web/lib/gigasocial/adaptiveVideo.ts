import type { VideoQualityId } from "@/lib/gigasocial/dataSaver";

export type AdaptiveStreamVariant = {
  quality: Exclude<VideoQualityId, "auto">;
  url: string;
};

/**
 * Pick a stream URL for the requested quality without interrupting playback.
 * When only one URL exists (typical today), returns it for all video qualities
 * and null for audio-only so the caller can show a poster + audio affordance.
 */
export function pickAdaptiveStreamUrl(
  primaryUrl: string | undefined,
  variants: AdaptiveStreamVariant[] | undefined,
  quality: VideoQualityId
): { url: string | null; audioOnly: boolean } {
  if (!primaryUrl && (!variants || variants.length === 0)) {
    return { url: null, audioOnly: false };
  }

  if (quality === "audio") {
    const audioVariant = variants?.find((v) => v.quality === "audio");
    return { url: audioVariant?.url ?? primaryUrl ?? null, audioOnly: true };
  }

  if (quality === "auto" || !variants?.length) {
    return { url: primaryUrl ?? variants?.[0]?.url ?? null, audioOnly: false };
  }

  const exact = variants.find((v) => v.quality === quality);
  if (exact) return { url: exact.url, audioOnly: false };

  const order: Exclude<VideoQualityId, "auto">[] = [
    "1080p",
    "720p",
    "480p",
    "360p",
    "240p",
    "audio",
  ];
  const targetIndex = order.indexOf(quality);
  for (let i = targetIndex; i < order.length; i += 1) {
    const match = variants.find((v) => v.quality === order[i]);
    if (match && match.quality !== "audio") {
      return { url: match.url, audioOnly: false };
    }
  }
  for (let i = targetIndex - 1; i >= 0; i -= 1) {
    const match = variants.find((v) => v.quality === order[i]);
    if (match && match.quality !== "audio") {
      return { url: match.url, audioOnly: false };
    }
  }

  return { url: primaryUrl ?? null, audioOnly: false };
}

/** Preserve currentTime across a quality switch when the element is ready. */
export function applyQualitySwitch(
  video: HTMLVideoElement,
  nextUrl: string,
  previousTime: number,
  wasPlaying: boolean
): void {
  if (video.src === nextUrl || video.currentSrc === nextUrl) return;
  video.src = nextUrl;
  const resume = () => {
    try {
      if (Number.isFinite(previousTime) && previousTime > 0) {
        video.currentTime = previousTime;
      }
    } catch {
      /* ignore seek failures */
    }
    if (wasPlaying) {
      void video.play().catch(() => null);
    }
    video.removeEventListener("loadedmetadata", resume);
  };
  video.addEventListener("loadedmetadata", resume);
  video.load();
}
