/**
 * Bake GigaEdit video timeline edits into a new file (non-destructive).
 * Canvas + MediaRecorder — original upload is never overwritten.
 */

import { aspectRatioSize } from "@/lib/gigaedit/exportFormats";
import { detectDeviceTier, getExportMaxEdge, type DeviceTier } from "@/lib/gigaedit/deviceCapability";
import type { ExportAspectRatio } from "@/lib/gigaedit/types";
import { coverDrawRect } from "@/lib/gigasocial/photoMusicVideo";

export type JoinedVideoSegment = {
  file: File;
  sourceStartSec: number;
  sourceEndSec: number;
  speed?: number;
};

export type VideoExportOptions = {
  startSec: number;
  endSec: number;
  speed?: number;
  rotateDeg?: number;
  cropScale?: number;
  filterCss?: string;
  overlayText?: string;
  captions?: string;
  aspectRatio: ExportAspectRatio;
  /** null = keep source audio; Blob = replace; "mute" = no audio */
  audioMode?: "original" | "mute" | "replace";
  replaceAudio?: Blob | null;
  tier?: DeviceTier;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

function pickRecorderMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
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

function fitExportSize(
  targetW: number,
  targetH: number,
  tier: DeviceTier
): { width: number; height: number } {
  const maxEdge = Math.min(getExportMaxEdge(tier), tier === "low" ? 720 : tier === "mid" ? 1080 : 1440);
  const edge = Math.max(targetW, targetH);
  if (edge <= maxEdge) return { width: targetW, height: targetH };
  const scale = maxEdge / edge;
  return {
    width: Math.max(2, Math.round(targetW * scale / 2) * 2),
    height: Math.max(2, Math.round(targetH * scale / 2) * 2),
  };
}

async function loadAudioBufferSource(
  ctx: AudioContext,
  blob: Blob
): Promise<AudioBufferSourceNode> {
  const data = await blob.arrayBuffer();
  const buffer = await ctx.decodeAudioData(data.slice(0));
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

/**
 * Export an edited video segment with filters/transform/overlay baked in.
 */
export async function exportEditedVideoFile(
  sourceFile: File,
  options: VideoExportOptions
): Promise<{ file: File; durationSec: number }> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Video export is not supported in this environment.");
  }

  const startSec = Math.max(0, options.startSec);
  const endSec = Math.max(startSec + 0.25, options.endSec);
  const speed = Math.min(3, Math.max(0.25, options.speed ?? 1));
  const clipDuration = (endSec - startSec) / speed;
  const tier = options.tier ?? detectDeviceTier();
  const target = aspectRatioSize(options.aspectRatio);
  const { width, height } = fitExportSize(target.width, target.height, tier);

  const url = URL.createObjectURL(sourceFile);
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.muted = true; // draw path; audio mixed separately when possible
  video.src = url;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Could not create export canvas.");
  }

  let audioCtx: AudioContext | null = null;
  let dest: MediaStreamAudioDestinationNode | null = null;
  const tracksToStop: MediaStreamTrack[] = [];

  try {
    await waitForEvent(video, "loadedmetadata", "Could not load video for export.");
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("Could not read this video length.");
    }

    const canvasStream = canvas.captureStream(30);
    const composed = new MediaStream(canvasStream.getVideoTracks());

    const audioMode = options.audioMode ?? "original";
    if (audioMode !== "mute") {
      try {
        audioCtx = new AudioContext();
        dest = audioCtx.createMediaStreamDestination();
        if (audioMode === "replace" && options.replaceAudio) {
          const source = await loadAudioBufferSource(audioCtx, options.replaceAudio);
          source.connect(dest);
          source.start(0, startSec, endSec - startSec);
        } else {
          // Tap source video element audio when available.
          const elSource = audioCtx.createMediaElementSource(video);
          elSource.connect(dest);
          video.muted = false;
          video.volume = 1;
        }
        dest.stream.getAudioTracks().forEach((t) => {
          composed.addTrack(t);
          tracksToStop.push(t);
        });
      } catch {
        /* continue video-only */
      }
    }

    canvasStream.getVideoTracks().forEach((t) => tracksToStop.push(t));

    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(composed, {
      mimeType,
      videoBitsPerSecond: tier === "low" ? 2_500_000 : 5_000_000,
      audioBitsPerSecond: 128_000,
    });
    const chunks: BlobPart[] = [];
    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Video export failed."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
    });

    const rotateDeg = ((options.rotateDeg ?? 0) % 360 + 360) % 360;
    const cropScale = Math.max(1, options.cropScale ?? 1);
    const filterCss = options.filterCss && options.filterCss !== "none" ? options.filterCss : "";
    const overlay = options.overlayText?.trim() || "";
    const captionLine = options.captions?.trim().split("\n").filter(Boolean).slice(0, 2).join(" · ") || "";

    const drawFrame = () => {
      const vw = video.videoWidth || width;
      const vh = video.videoHeight || height;
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      ctx.translate(width / 2, height / 2);
      ctx.rotate((rotateDeg * Math.PI) / 180);
      ctx.scale(cropScale, cropScale);
      ctx.filter = filterCss || "none";
      const cover = coverDrawRect(vw, vh, width, height);
      ctx.drawImage(
        video,
        cover.sx,
        cover.sy,
        cover.sw,
        cover.sh,
        -width / 2,
        -height / 2,
        width,
        height
      );
      ctx.filter = "none";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (overlay) {
        ctx.fillStyle = "rgba(11,18,32,0.45)";
        ctx.fillRect(0, height * 0.72, width, height * 0.28);
        ctx.fillStyle = "#fbbf24";
        ctx.font = `bold ${Math.max(22, Math.floor(width * 0.045))}px system-ui,sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(overlay, width / 2, height * 0.86, width * 0.9);
      }
      if (captionLine) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = `${Math.max(16, Math.floor(width * 0.028))}px system-ui,sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(captionLine, width / 2, height * 0.08, width * 0.92);
      }
      ctx.restore();
    };

    // Seek without hanging when already near start.
    if (Math.abs(video.currentTime - startSec) > 0.05) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        video.onseeked = done;
        window.setTimeout(done, 500);
        try {
          video.currentTime = startSec;
        } catch {
          done();
        }
      });
    }

    video.playbackRate = speed;
    recorder.start(200);
    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play();
    }

    await new Promise<void>((resolve, reject) => {
      let raf = 0;
      const onAbort = () => {
        cancelAnimationFrame(raf);
        video.pause();
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch {
          /* */
        }
        reject(new Error("Export cancelled."));
      };
      options.signal?.addEventListener("abort", onAbort, { once: true });

      const tick = () => {
        if (options.signal?.aborted) {
          onAbort();
          return;
        }
        drawFrame();
        const progress = (video.currentTime - startSec) / Math.max(0.001, endSec - startSec);
        options.onProgress?.(Math.min(1, Math.max(0, progress)));
        if (video.currentTime >= endSec - 0.05 || video.ended) {
          video.pause();
          drawFrame();
          try {
            if (recorder.state !== "inactive") recorder.stop();
          } catch {
            /* */
          }
          resolve();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      window.setTimeout(() => {
        if (recorder.state === "recording") {
          cancelAnimationFrame(raf);
          video.pause();
          try {
            recorder.stop();
          } catch {
            /* */
          }
          resolve();
        }
      }, Math.ceil(clipDuration * 1000) + 6000);
    });

    const blob = await recorded;
    if (!blob.size) throw new Error("Export produced an empty video.");

    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const base = sourceFile.name.replace(/\.[^.]+$/, "") || "gigaedit";
    return {
      file: new File([blob], `${base}-edited.${ext}`, { type: mimeType }),
      durationSec: clipDuration,
    };
  } finally {
    tracksToStop.forEach((t) => {
      try {
        t.stop();
      } catch {
        /* */
      }
    });
    void audioCtx?.close().catch(() => undefined);
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

type SharedDrawOptions = {
  rotateDeg: number;
  cropScale: number;
  filterCss: string;
  overlayText: string;
  captionLine: string;
  width: number;
  height: number;
};

function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  options: SharedDrawOptions
) {
  const { width, height, rotateDeg, cropScale, filterCss, overlayText, captionLine } = options;
  const vw = video.videoWidth || width;
  const vh = video.videoHeight || height;
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  ctx.scale(cropScale, cropScale);
  ctx.filter = filterCss || "none";
  const cover = coverDrawRect(vw, vh, width, height);
  ctx.drawImage(
    video,
    cover.sx,
    cover.sy,
    cover.sw,
    cover.sh,
    -width / 2,
    -height / 2,
    width,
    height
  );
  ctx.filter = "none";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (overlayText) {
    ctx.fillStyle = "rgba(11,18,32,0.45)";
    ctx.fillRect(0, height * 0.72, width, height * 0.28);
    ctx.fillStyle = "#fbbf24";
    ctx.font = `bold ${Math.max(22, Math.floor(width * 0.045))}px system-ui,sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(overlayText, width / 2, height * 0.86, width * 0.9);
  }
  if (captionLine) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `${Math.max(16, Math.floor(width * 0.028))}px system-ui,sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(captionLine, width / 2, height * 0.08, width * 0.92);
  }
  ctx.restore();
}

async function recordVideoSegment(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  recorder: MediaRecorder,
  segment: JoinedVideoSegment,
  drawOptions: SharedDrawOptions,
  options: {
    onProgress?: (segmentIndex: number, segmentCount: number, localProgress: number) => void;
    segmentIndex: number;
    segmentCount: number;
    signal?: AbortSignal;
  }
): Promise<void> {
  const startSec = Math.max(0, segment.sourceStartSec);
  const endSec = Math.max(startSec + 0.25, segment.sourceEndSec);
  const speed = Math.min(3, Math.max(0.25, segment.speed ?? 1));
  const span = endSec - startSec;

  if (Math.abs(video.currentTime - startSec) > 0.05) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      video.onseeked = done;
      window.setTimeout(done, 500);
      try {
        video.currentTime = startSec;
      } catch {
        done();
      }
    });
  }

  video.playbackRate = speed;
  try {
    await video.play();
  } catch {
    video.muted = true;
    await video.play();
  }

  await new Promise<void>((resolve, reject) => {
    let raf = 0;
    const onAbort = () => {
      cancelAnimationFrame(raf);
      video.pause();
      reject(new Error("Export cancelled."));
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    const tick = () => {
      if (options.signal?.aborted) {
        onAbort();
        return;
      }
      drawVideoFrame(ctx, video, drawOptions);
      const progress = (video.currentTime - startSec) / Math.max(0.001, span);
      options.onProgress?.(options.segmentIndex, options.segmentCount, Math.min(1, Math.max(0, progress)));
      if (video.currentTime >= endSec - 0.05 || video.ended) {
        video.pause();
        drawVideoFrame(ctx, video, drawOptions);
        resolve();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.setTimeout(() => {
      if (!video.paused) {
        cancelAnimationFrame(raf);
        video.pause();
        resolve();
      }
    }, Math.ceil((span / speed) * 1000) + 6000);
  });
}

/** Join up to 10 source videos into one exported file (non-destructive). */
export async function exportJoinedVideoClips(
  segments: JoinedVideoSegment[],
  options: Omit<VideoExportOptions, "startSec" | "endSec" | "speed"> & {
    signal?: AbortSignal;
  }
): Promise<{ file: File; durationSec: number }> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Video export is not supported in this environment.");
  }
  if (segments.length === 0) {
    throw new Error("Add at least one video clip to join.");
  }

  const tier = options.tier ?? detectDeviceTier();
  const target = aspectRatioSize(options.aspectRatio);
  const { width, height } = fitExportSize(target.width, target.height, tier);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create export canvas.");

  const rotateDeg = ((options.rotateDeg ?? 0) % 360 + 360) % 360;
  const cropScale = Math.max(1, options.cropScale ?? 1);
  const filterCss = options.filterCss && options.filterCss !== "none" ? options.filterCss : "";
  const overlay = options.overlayText?.trim() || "";
  const captionLine = options.captions?.trim().split("\n").filter(Boolean).slice(0, 2).join(" · ") || "";
  const drawOptions: SharedDrawOptions = {
    rotateDeg,
    cropScale,
    filterCss,
    overlayText: overlay,
    captionLine,
    width,
    height,
  };

  const canvasStream = canvas.captureStream(30);
  const composed = new MediaStream(canvasStream.getVideoTracks());
  const tracksToStop: MediaStreamTrack[] = canvasStream.getVideoTracks();
  const mimeType = pickRecorderMimeType();
  const recorder = new MediaRecorder(composed, {
    mimeType,
    videoBitsPerSecond: tier === "low" ? 2_500_000 : 5_000_000,
    audioBitsPerSecond: 128_000,
  });
  const chunks: BlobPart[] = [];
  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Video export failed."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
  });

  recorder.start(200);
  let totalDurationSec = 0;
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.muted = true;

  try {
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const speed = Math.min(3, Math.max(0.25, segment.speed ?? 1));
      totalDurationSec += (segment.sourceEndSec - segment.sourceStartSec) / speed;
      const url = URL.createObjectURL(segment.file);
      video.src = url;
      await waitForEvent(video, "loadedmetadata", "Could not load video for export.");
      await recordVideoSegment(video, canvas, ctx, recorder, segment, drawOptions, {
        segmentIndex: index,
        segmentCount: segments.length,
        signal: options.signal,
        onProgress: (segmentIndex, segmentCount, localProgress) => {
          const overall = (segmentIndex + localProgress) / segmentCount;
          options.onProgress?.(overall);
        },
      });
      video.pause();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    }

    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      /* ignore */
    }

    const blob = await recorded;
    if (!blob.size) throw new Error("Export produced an empty video.");

    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const base = segments[0]?.file.name.replace(/\.[^.]+$/, "") || "gigaedit-joined";
    return {
      file: new File([blob], `${base}-joined.${ext}`, { type: mimeType }),
      durationSec: totalDurationSec,
    };
  } finally {
    tracksToStop.forEach((track) => {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    });
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

/** Whether export is needed vs handing off the original file unchanged. */
export function videoNeedsBake(options: {
  startSec: number;
  endSec: number;
  duration: number;
  speed: number;
  rotateDeg: number;
  cropScale: number;
  filterCss: string;
  overlayText: string;
  captions: string;
  audioMode: "original" | "mute" | "replace";
}): boolean {
  const fullSpan =
    options.startSec <= 0.05 && options.endSec >= Math.max(0, options.duration) - 0.08;
  if (!fullSpan) return true;
  if (options.speed !== 1) return true;
  if (options.rotateDeg % 360 !== 0) return true;
  if (options.cropScale > 1.01) return true;
  if (options.filterCss && options.filterCss !== "none") return true;
  if (options.overlayText.trim()) return true;
  if (options.captions.trim()) return true;
  if (options.audioMode !== "original") return true;
  return false;
}
