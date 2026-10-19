import { SOCIAL_MAX_VIDEO_DURATION_SEC } from "@/lib/gigasocial/constants";

export type VideoTrimRange = {
  startSec: number;
  endSec: number;
};

export const VIDEO_CLIP_LENGTH_OPTIONS_SEC = [60, 120, 180, 360] as const;

export function formatVideoTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && !Number.isNaN(seconds) ? seconds : 0;
  const total = Math.max(0, Math.floor(safe));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function needsVideoTrim(
  durationSec: number,
  maxClipSec: number = SOCIAL_MAX_VIDEO_DURATION_SEC
): boolean {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return false;
  return durationSec > maxClipSec + 0.05;
}

/**
 * Sliding clip window. `clipLengthSec` lets users shorten below the max
 * (e.g. 60s / 120s / 180s / 360s) while staying within source duration.
 */
export function computeTrimRange(
  durationSec: number,
  startSec: number,
  maxClipSec: number = SOCIAL_MAX_VIDEO_DURATION_SEC,
  clipLengthSec?: number
): VideoTrimRange {
  const safeDuration = Math.max(0, durationSec);
  const requested = clipLengthSec ?? Math.min(maxClipSec, safeDuration);
  const clipLen = Math.min(maxClipSec, safeDuration, Math.max(1, requested));
  const maxStart = Math.max(0, safeDuration - clipLen);
  const safeStart = Math.min(Math.max(0, startSec), maxStart);
  return {
    startSec: safeStart,
    endSec: safeStart + clipLen,
  };
}

function pickRecorderMimeType(): string {
  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

function mediaErrorMessage(video: HTMLVideoElement): string {
  const code = video.error?.code;
  const unsupported =
    typeof MediaError !== "undefined" ? MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED : 4;
  const decode = typeof MediaError !== "undefined" ? MediaError.MEDIA_ERR_DECODE : 3;
  const network = typeof MediaError !== "undefined" ? MediaError.MEDIA_ERR_NETWORK : 2;
  if (code === unsupported) {
    return "This video format cannot be edited in-browser. Try MP4 (H.264) or a shorter export.";
  }
  if (code === decode) {
    return "Could not decode this video for editing. Try re-exporting it as MP4, or split on a desktop browser.";
  }
  if (code === network) {
    return "Could not read the video file. Close other previews and try again.";
  }
  return "Could not load video for trimming.";
}

function waitForEvent(
  target: HTMLVideoElement,
  event: string,
  timeoutMs = 20_000
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const onOk = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onErr = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(mediaErrorMessage(target)));
    };
    const onTimeout = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Timed out loading video for trimming. Try again on Wi‑Fi or a shorter clip."));
    };
    const cleanup = () => {
      target.removeEventListener(event, onOk);
      target.removeEventListener("error", onErr);
      window.clearTimeout(timer);
    };
    const timer = window.setTimeout(onTimeout, timeoutMs);
    if (event === "loadedmetadata" && target.readyState >= 1) {
      window.clearTimeout(timer);
      resolve();
      return;
    }
    if (event === "loadeddata" && target.readyState >= 2) {
      window.clearTimeout(timer);
      resolve();
      return;
    }
    if (event === "canplay" && target.readyState >= 3) {
      window.clearTimeout(timer);
      resolve();
      return;
    }
    target.addEventListener(event, onOk, { once: true });
    target.addEventListener("error", onErr, { once: true });
  });
}

function getCaptureStream(video: HTMLVideoElement): MediaStream | null {
  if (typeof video.captureStream === "function") {
    return video.captureStream();
  }
  const legacy = video as HTMLVideoElement & { mozCaptureStream?: () => MediaStream };
  if (typeof legacy.mozCaptureStream === "function") {
    return legacy.mozCaptureStream();
  }
  return null;
}

async function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  const target = Math.max(0, Math.min(timeSec, Number.isFinite(video.duration) ? video.duration : timeSec));
  if (Math.abs(video.currentTime - target) < 0.05) return;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      // Some Android WebViews only seek reliably after canplay.
      if (video.readyState < 2) {
        await waitForEvent(video, "loadeddata", 15_000);
      }
      const seeked = waitForEvent(video, "seeked", 12_000);
      video.currentTime = target;
      await seeked;
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Could not seek video.");
      await new Promise((resolve) => window.setTimeout(resolve, 120 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("Could not seek video for trimming.");
}

function mountHiddenVideo(video: HTMLVideoElement): () => void {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // Keep off-screen but in the document — required for captureStream on many Android browsers.
  video.style.cssText =
    "position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:-9999px;top:0;";
  document.body.appendChild(video);
  return () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  };
}

/**
 * Re-encodes a segment of a local video file to meet the GigaSocial duration cap.
 * Uses MediaRecorder + captureStream (best-effort; preserves audio when the browser allows).
 */
export async function trimVideoFile(
  file: File,
  range: VideoTrimRange,
  options?: {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
    /** Reuse an existing object URL (e.g. composer preview) instead of creating another. */
    objectUrl?: string;
  }
): Promise<{ file: File; durationSec: number }> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Video trimming is not supported in this environment.");
  }

  const clipDuration = range.endSec - range.startSec;
  if (clipDuration <= 0 || clipDuration > SOCIAL_MAX_VIDEO_DURATION_SEC + 0.5) {
    throw new Error("Invalid trim range. Choose a shorter clip and try again.");
  }

  const ownsUrl = !options?.objectUrl;
  const url = options?.objectUrl ?? URL.createObjectURL(file);
  const video = document.createElement("video");
  // Never set crossOrigin on blob: URLs — it breaks load/seek on Android Chrome/WebView.
  const unmount = mountHiddenVideo(video);
  video.src = url;

  let stream: MediaStream | null = null;

  try {
    if (options?.signal?.aborted) {
      throw new Error("Trim cancelled.");
    }

    await waitForEvent(video, "loadedmetadata", 25_000);
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      // Force a duration probe used by some mobile browsers.
      try {
        video.currentTime = 1e101;
        await waitForEvent(video, "timeupdate", 8_000);
        video.currentTime = 0;
        await waitForEvent(video, "seeked", 8_000);
      } catch {
        /* fall through */
      }
    }
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("Could not read this video length. Try another file.");
    }

    await waitForEvent(video, "loadeddata", 20_000).catch(() => undefined);

    stream = getCaptureStream(video);
    if (!stream || stream.getVideoTracks().length === 0) {
      throw new Error(
        `Video shortening is not supported on this device/browser. Try Chrome/Firefox, or pick a clip under ${SOCIAL_MAX_VIDEO_DURATION_SEC} seconds.`
      );
    }

    // Lower bitrate for large sources so mobile encode is less likely to OOM.
    const largeSource = file.size > 80 * 1024 * 1024;
    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: largeSource ? 2_500_000 : 5_000_000,
      audioBitsPerSecond: 128_000,
    });
    const chunks: BlobPart[] = [];

    if (options?.signal?.aborted) {
      throw new Error("Trim cancelled.");
    }

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Video trim export failed. Try again."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
    });

    await seekVideo(video, range.startSec);

    // Prefer unmuted capture so audio tracks are recorded when the browser allows.
    video.muted = false;
    video.volume = 1;

    recorder.start(200);
    try {
      await video.play();
    } catch {
      // Autoplay policies: retry muted (video only) so trim still completes.
      video.muted = true;
      await video.play();
    }

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        video.pause();
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
        reject(new Error("Trim cancelled."));
      };

      const onTimeUpdate = () => {
        if (options?.signal?.aborted) {
          onAbort();
          return;
        }
        const progress = (video.currentTime - range.startSec) / clipDuration;
        options?.onProgress?.(Math.min(1, Math.max(0, progress)));

        if (video.currentTime >= range.endSec - 0.08 || video.ended) {
          cleanup();
          video.pause();
          try {
            if (recorder.state !== "inactive") recorder.stop();
          } catch {
            /* ignore */
          }
          resolve();
        }
      };

      const cleanup = () => {
        video.removeEventListener("timeupdate", onTimeUpdate);
        options?.signal?.removeEventListener("abort", onAbort);
      };

      video.addEventListener("timeupdate", onTimeUpdate);
      options?.signal?.addEventListener("abort", onAbort);

      // Safety timeout if timeupdate stalls (some Android WebViews).
      window.setTimeout(() => {
        if (recorder.state === "recording") {
          cleanup();
          video.pause();
          try {
            recorder.stop();
          } catch {
            /* ignore */
          }
          resolve();
        }
      }, Math.ceil(clipDuration * 1000) + 4000);
    });

    const blob = await recorded;
    if (!blob.size) {
      throw new Error("Trim produced an empty video. Try a different start point or shorter length.");
    }

    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "gigasocial-clip";
    const trimmed = new File([blob], `${baseName}-trim.${ext}`, { type: mimeType });

    return { file: trimmed, durationSec: clipDuration };
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
    unmount();
    if (ownsUrl) {
      URL.revokeObjectURL(url);
    }
  }
}
