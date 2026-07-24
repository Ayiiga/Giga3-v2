/**
 * Compose photo(s) + music into a single video with background audio.
 * Uses canvas.captureStream + MediaRecorder (best-effort across browsers).
 */

import { SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC } from "@/lib/gigasocial/constants";

export const PHOTO_MUSIC_OUTPUT_WIDTH = 1080;
export const PHOTO_MUSIC_OUTPUT_HEIGHT = 1350; // 4:5
export const PHOTO_MUSIC_MIN_SLIDE_SEC = 2.5;

export type ComposePhotoMusicOptions = {
  /** Cap for output length (defaults to photo-music max). */
  maxDurationSec?: number;
  /** CSS filter string applied while drawing frames (e.g. camera filter). */
  filterCss?: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

export type ComposePhotoMusicResult = {
  file: File;
  durationSec: number;
};

/** How long each photo is shown for a given audio length. */
export function computeSlideDurationSec(
  imageCount: number,
  audioDurationSec: number
): number {
  const count = Math.max(1, imageCount);
  const total = Math.max(0.5, audioDurationSec);
  return Math.max(PHOTO_MUSIC_MIN_SLIDE_SEC, total / count);
}

/** Cover-fit draw rect for an image into a fixed canvas. */
export function coverDrawRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const srcRatio = srcW / Math.max(1, srcH);
  const dstRatio = dstW / Math.max(1, dstH);
  if (srcRatio > dstRatio) {
    const sw = srcH * dstRatio;
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh: srcH };
  }
  const sh = srcW / dstRatio;
  return { sx: 0, sy: (srcH - sh) / 2, sw: srcW, sh };
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

function waitForEvent(target: EventTarget, event: string, errorMessage: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error(errorMessage));
    };
    const cleanup = () => {
      target.removeEventListener(event, onOk);
      target.removeEventListener("error", onErr);
    };
    target.addEventListener(event, onOk, { once: true });
    target.addEventListener("error", onErr, { once: true });
  });
}

async function loadImageFromFile(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  try {
    if (typeof image.decode === "function") {
      await image.decode();
    } else {
      await waitForEvent(image, "load", "Could not load photo for music video.");
    }
    return { image, url };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error instanceof Error ? error : new Error("Could not load photo for music video.");
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error("Music video export cancelled.");
}

/**
 * Builds a short social video from one or more photos + a music track.
 * Output length matches the (already trimmed) audio, capped at maxDurationSec.
 */
export async function composePhotoMusicVideo(
  images: File[],
  audioFile: File,
  options?: ComposePhotoMusicOptions
): Promise<ComposePhotoMusicResult> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Photo + music export is not supported in this environment.");
  }
  if (!images.length) {
    throw new Error("Add at least one photo before attaching music.");
  }

  const maxDurationSec = options?.maxDurationSec ?? SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC;
  throwIfAborted(options?.signal);

  const loaded = await Promise.all(images.map((file) => loadImageFromFile(file)));

  let audioContext: AudioContext | null = null;
  let drawTimer = 0;
  let canvasStream: MediaStream | null = null;
  let combined: MediaStream | null = null;
  let bufferSource: AudioBufferSourceNode | null = null;

  try {
    throwIfAborted(options?.signal);

    audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume().catch(() => undefined);
    }

    const audioArrayBuffer = await audioFile.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(audioArrayBuffer.slice(0));
    const audioDuration = decoded.duration;
    if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
      throw new Error("Could not verify music duration. Try another track.");
    }
    const durationSec = Math.min(maxDurationSec, audioDuration);
    const slideSec = computeSlideDurationSec(loaded.length, durationSec);

    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_MUSIC_OUTPUT_WIDTH;
    canvas.height = PHOTO_MUSIC_OUTPUT_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the music video canvas.");

    const drawFrame = (elapsedSec: number) => {
      const index = Math.min(
        loaded.length - 1,
        Math.floor(elapsedSec / slideSec) % loaded.length
      );
      const { image } = loaded[index];
      const rect = coverDrawRect(
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
        canvas.width,
        canvas.height
      );
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.filter = options?.filterCss || "none";
      // Subtle Ken Burns: slow zoom over each slide.
      const localT = (elapsedSec % slideSec) / slideSec;
      const zoom = 1 + localT * 0.06;
      const zw = canvas.width * zoom;
      const zh = canvas.height * zoom;
      const zx = (canvas.width - zw) / 2;
      const zy = (canvas.height - zh) / 2;
      ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, zx, zy, zw, zh);
      ctx.filter = "none";
    };

    drawFrame(0);
    canvasStream = canvas.captureStream(30);
    if (!canvasStream.getVideoTracks().length) {
      throw new Error("This browser cannot export photo + music as video.");
    }

    const destination = audioContext.createMediaStreamDestination();
    bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = decoded;
    bufferSource.connect(destination);

    const audioTracks = destination.stream.getAudioTracks();
    if (!audioTracks.length) {
      throw new Error("Could not capture music audio for the video export.");
    }

    combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: 4_500_000,
      audioBitsPerSecond: 128_000,
    });
    const chunks: BlobPart[] = [];

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Music video export failed. Try again."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
    });

    const startedAt = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      drawFrame(Math.min(elapsed, durationSec));
      options?.onProgress?.(Math.min(1, elapsed / durationSec));
      if (elapsed < durationSec && recorder.state === "recording") {
        drawTimer = window.requestAnimationFrame(tick);
      }
    };

    recorder.start(250);
    bufferSource.start(0, 0, durationSec);
    drawTimer = window.requestAnimationFrame(tick);

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(stopTimer);
        window.clearTimeout(safetyTimer);
        options?.signal?.removeEventListener("abort", onAbort);
        if (error) reject(error);
        else resolve();
      };
      const onAbort = () => finish(new Error("Music video export cancelled."));
      options?.signal?.addEventListener("abort", onAbort);

      const stopTimer = window.setTimeout(() => finish(), Math.ceil(durationSec * 1000) + 80);
      const safetyTimer = window.setTimeout(() => finish(), Math.ceil(durationSec * 1000) + 2500);
    });

    throwIfAborted(options?.signal);

    try {
      bufferSource.stop();
    } catch {
      /* already stopped */
    }
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    window.cancelAnimationFrame(drawTimer);

    const blob = await recorded;
    if (!blob.size) {
      throw new Error("Music video export produced an empty file. Try another photo or track.");
    }

    options?.onProgress?.(1);
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const file = new File([blob], `photo-music-${Date.now()}.${ext}`, { type: mimeType });
    return { file, durationSec };
  } finally {
    window.cancelAnimationFrame(drawTimer);
    try {
      bufferSource?.stop();
    } catch {
      /* ignore */
    }
    for (const item of loaded) URL.revokeObjectURL(item.url);
    canvasStream?.getTracks().forEach((track) => track.stop());
    combined?.getTracks().forEach((track) => track.stop());
    if (audioContext) {
      await audioContext.close().catch(() => undefined);
    }
  }
}
