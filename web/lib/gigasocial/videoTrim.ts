import { SOCIAL_MAX_VIDEO_DURATION_SEC } from "@/lib/gigasocial/constants";

export type VideoTrimRange = {
  startSec: number;
  endSec: number;
};

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
  return durationSec > maxClipSec + 0.05;
}

/** Fixed-length clip window sliding along a longer source video. */
export function computeTrimRange(
  durationSec: number,
  startSec: number,
  maxClipSec: number = SOCIAL_MAX_VIDEO_DURATION_SEC
): VideoTrimRange {
  const clipLen = Math.min(maxClipSec, durationSec);
  const maxStart = Math.max(0, durationSec - clipLen);
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
    throw new Error("Invalid trim range.");
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  let stream: MediaStream | null = null;

  try {
    await waitForEvent(video, "loadedmetadata");

    stream = getCaptureStream(video);
    if (!stream) {
      throw new Error(
        "Video trimming is not supported on this device. Try a shorter clip or update your browser."
      );
    }

    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2_800_000,
    });
    const chunks: BlobPart[] = [];

    if (options?.signal?.aborted) {
      throw new Error("Trim cancelled.");
    }

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Video trim export failed."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
    });

    video.volume = 0;
    video.muted = false;
    video.currentTime = range.startSec;
    await waitForEvent(video, "seeked");

    recorder.start(250);
    await video.play();

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
          recorder.stop();
          resolve();
        }
      };

      const cleanup = () => {
        video.removeEventListener("timeupdate", onTimeUpdate);
        options?.signal?.removeEventListener("abort", onAbort);
      };

      video.addEventListener("timeupdate", onTimeUpdate);
      options?.signal?.addEventListener("abort", onAbort);
    });

    const blob = await recorded;
    if (!blob.size) {
      throw new Error("Trim produced an empty video. Try again or use a shorter source file.");
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
