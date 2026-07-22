import { SOCIAL_MAX_VIDEO_DURATION_SEC } from "@/lib/gigasocial/constants";

export type VideoTrimRange = {
  startSec: number;
  endSec: number;
};

export const VIDEO_CLIP_LENGTH_OPTIONS_SEC = [15, 30, 40] as const;

export function formatVideoTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
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
 * (e.g. 15s / 30s / 40s) while staying within source duration.
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

function waitForEvent(target: EventTarget, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("Could not load video for trimming."));
    };
    const cleanup = () => {
      target.removeEventListener(event, onOk);
      target.removeEventListener("error", onErr);
    };
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
  }
): Promise<{ file: File; durationSec: number }> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Video trimming is not supported in this environment.");
  }

  const clipDuration = range.endSec - range.startSec;
  if (clipDuration <= 0 || clipDuration > SOCIAL_MAX_VIDEO_DURATION_SEC + 0.5) {
    throw new Error("Invalid trim range. Choose a shorter clip and try again.");
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.src = url;

  let stream: MediaStream | null = null;

  try {
    await waitForEvent(video, "loadedmetadata");
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("Could not read this video length. Try another file.");
    }

    stream = getCaptureStream(video);
    if (!stream || stream.getVideoTracks().length === 0) {
      throw new Error(
        "Video shortening is not supported on this device/browser. Try Chrome/Firefox, or pick a clip under 40 seconds."
      );
    }

    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
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

    // Prefer unmuted capture so audio tracks are recorded when the browser allows.
    video.muted = false;
    video.volume = 1;
    video.currentTime = range.startSec;
    await waitForEvent(video, "seeked");

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
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
