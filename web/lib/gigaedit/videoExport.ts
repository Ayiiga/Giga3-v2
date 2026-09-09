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

/** Clamp export segment bounds to the real media duration (prevents hangs near clip end). */
export function normalizeJoinSegmentBounds(
  segment: JoinedVideoSegment,
  videoDurationSec: number
): JoinedVideoSegment {
  const mediaDuration =
    Number.isFinite(videoDurationSec) && videoDurationSec > 0 ? videoDurationSec : null;
  let startSec = Math.max(0, segment.sourceStartSec);
  let endSec = Math.max(startSec + 0.1, segment.sourceEndSec);
  if (mediaDuration !== null) {
    startSec = Math.min(startSec, mediaDuration);
    endSec = Math.min(endSec, mediaDuration);
  }
  if (endSec <= startSec) {
    endSec = Math.min(startSec + 0.25, mediaDuration ?? startSec + 0.25);
  }
  return { ...segment, sourceStartSec: startSec, sourceEndSec: endSec };
}

function stopMediaRecorderSafely(recorder: MediaRecorder): void {
  try {
    if (recorder.state === "recording") {
      recorder.requestData();
      recorder.stop();
    }
  } catch {
    /* ignore */
  }
}

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
): Promise<{ source: AudioBufferSourceNode; durationSec: number }> {
  const data = await blob.arrayBuffer();
  const buffer = await ctx.decodeAudioData(data.slice(0));
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return { source, durationSec: buffer.duration };
}

async function resumeAudioContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

type VideoWithCapture = HTMLVideoElement & { captureStream?: () => MediaStream };

async function attachVideoElementAudio(
  audioCtx: AudioContext,
  video: HTMLVideoElement,
  dest: MediaStreamAudioDestinationNode,
  composed: MediaStream,
  tracksToStop: MediaStreamTrack[]
): Promise<boolean> {
  const captureStream = (video as VideoWithCapture).captureStream?.();
  const captureTrack = captureStream?.getAudioTracks()[0];
  if (captureTrack) {
    composed.addTrack(captureTrack);
    tracksToStop.push(captureTrack);
    video.muted = false;
    video.volume = 1;
    return true;
  }

  const elSource = audioCtx.createMediaElementSource(video);
  elSource.connect(dest);
  video.muted = false;
  video.volume = 1;
  dest.stream.getAudioTracks().forEach((track) => {
    composed.addTrack(track);
    tracksToStop.push(track);
  });
  return dest.stream.getAudioTracks().length > 0;
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

  let startSec = Math.max(0, options.startSec);
  let endSec = Math.max(startSec + 0.25, options.endSec);
  const speed = Math.min(3, Math.max(0.25, options.speed ?? 1));
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
    const bounded = normalizeJoinSegmentBounds(
      { file: sourceFile, sourceStartSec: startSec, sourceEndSec: endSec, speed },
      video.duration
    );
    startSec = bounded.sourceStartSec;
    endSec = bounded.sourceEndSec;
    const clipDuration = (endSec - startSec) / speed;

    const canvasStream = canvas.captureStream(30);
    const composed = new MediaStream(canvasStream.getVideoTracks());

    const audioMode = options.audioMode ?? "original";
    let audioAttachError: string | null = null;
    if (audioMode !== "mute") {
      try {
        audioCtx = new AudioContext();
        await resumeAudioContext(audioCtx);
        dest = audioCtx.createMediaStreamDestination();
        if (audioMode === "replace" && options.replaceAudio) {
          const { source, durationSec } = await loadAudioBufferSource(
            audioCtx,
            options.replaceAudio
          );
          source.connect(dest);
          const playDuration = Math.min(durationSec, clipDuration);
          source.start(0, 0, playDuration);
        } else {
          const attached = await attachVideoElementAudio(
            audioCtx,
            video,
            dest,
            composed,
            tracksToStop
          );
          if (!attached) {
            audioAttachError = "Could not capture source audio.";
          }
        }
        if (audioMode === "replace" && options.replaceAudio) {
          dest.stream.getAudioTracks().forEach((track) => {
            composed.addTrack(track);
            tracksToStop.push(track);
          });
        }
      } catch (err) {
        audioAttachError =
          err instanceof Error ? err.message : "Could not attach audio to export.";
      }
    }
    if (audioMode !== "mute" && audioAttachError && composed.getAudioTracks().length === 0) {
      throw new Error(
        audioMode === "replace"
          ? `Voiceover export failed: ${audioAttachError}`
          : `Video export failed: ${audioAttachError}`
      );
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
  const bounded = normalizeJoinSegmentBounds(
    segment,
    Number.isFinite(video.duration) ? video.duration : segment.sourceEndSec
  );
  const startSec = bounded.sourceStartSec;
  const endSec = bounded.sourceEndSec;
  const speed = Math.min(3, Math.max(0.25, bounded.speed ?? 1));
  const span = Math.max(0.1, endSec - startSec);
  const wallClockMs = Math.ceil((span / speed) * 1000) + 2500;

  if (Math.abs(video.currentTime - startSec) > 0.05) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      video.onseeked = done;
      window.setTimeout(done, 800);
      try {
        video.currentTime = startSec;
      } catch {
        done();
      }
    });
  }

  video.playbackRate = speed;
  video.muted = true;
  try {
    await video.play();
  } catch {
    await new Promise((r) => window.setTimeout(r, 120));
    await video.play().catch(() => undefined);
  }

  await new Promise<void>((resolve, reject) => {
    let raf = 0;
    let timeoutId = 0;
    const startedAt = performance.now();
    let lastAdvanceAt = startedAt;
    let lastCurrentTime = video.currentTime;

    const finish = () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeoutId);
      video.pause();
      drawVideoFrame(ctx, video, drawOptions);
      options.onProgress?.(options.segmentIndex, options.segmentCount, 1);
      resolve();
    };

    const onAbort = () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeoutId);
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
      const now = performance.now();
      if (video.currentTime > lastCurrentTime + 0.008) {
        lastCurrentTime = video.currentTime;
        lastAdvanceAt = now;
      }

      const elapsed = (now - startedAt) / 1000;
      const timeProgress = Math.min(1, elapsed / (span / speed));
      const mediaProgress = (video.currentTime - startSec) / span;
      const progress = Math.min(1, Math.max(timeProgress * 0.15, mediaProgress));
      options.onProgress?.(options.segmentIndex, options.segmentCount, progress);

      const nearEnd =
        video.ended ||
        video.currentTime >= endSec - 0.06 ||
        (Number.isFinite(video.duration) && video.currentTime >= video.duration - 0.06);
      const stalled = now - lastAdvanceAt > 1800 && progress < 0.98;
      const timedOut = now - startedAt >= wallClockMs;

      if (nearEnd || stalled || timedOut) {
        finish();
        return;
      }

      if (video.paused && now - startedAt > 400) {
        void video.play().catch(() => undefined);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    timeoutId = window.setTimeout(finish, wallClockMs);
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
  let audioCtx: AudioContext | null = null;
  let totalDurationSec = 0;

  const audioMode = options.audioMode ?? "original";
  let audioDest: MediaStreamAudioDestinationNode | null = null;
  let segmentElementSource: MediaElementAudioSourceNode | null = null;
  let audioAttachError: string | null = null;

  const disconnectSegmentElementSource = () => {
    if (!segmentElementSource) return;
    try {
      segmentElementSource.disconnect();
    } catch {
      /* ignore */
    }
    segmentElementSource = null;
  };

  if (audioMode !== "mute") {
    try {
      audioCtx = new AudioContext();
      await resumeAudioContext(audioCtx);
      audioDest = audioCtx.createMediaStreamDestination();
      if (audioMode === "replace" && options.replaceAudio) {
        const { source, durationSec } = await loadAudioBufferSource(
          audioCtx,
          options.replaceAudio
        );
        source.connect(audioDest);
        source.start(0, 0, durationSec);
        audioDest.stream.getAudioTracks().forEach((track) => {
          composed.addTrack(track);
          tracksToStop.push(track);
        });
      }
    } catch (err) {
      if (audioMode === "replace") {
        throw new Error(
          err instanceof Error
            ? `Voiceover export failed: ${err.message}`
            : "Voiceover export failed."
        );
      }
      audioAttachError =
        err instanceof Error ? err.message : "Could not initialize audio for export.";
    }
  }

  const mimeType = pickRecorderMimeType();
  const recorder = new MediaRecorder(composed, {
    mimeType,
    videoBitsPerSecond: tier === "low" ? 2_500_000 : 5_000_000,
    audioBitsPerSecond: 128_000,
  });
  const chunks: BlobPart[] = [];
  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = (event) => {
      const detail = (event as Event & { error?: DOMException }).error;
      reject(new Error(detail?.message || "Video export failed."));
    };
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
  });

  let recorderStarted = false;
  if (audioMode === "replace" && composed.getAudioTracks().length > 0) {
    recorder.start(200);
    recorderStarted = true;
  }

  try {
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const speed = Math.min(3, Math.max(0.25, segment.speed ?? 1));
      totalDurationSec += (segment.sourceEndSec - segment.sourceStartSec) / speed;
      const url = URL.createObjectURL(segment.file);
      const video = document.createElement("video");
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;
      video.src = url;
      await waitForEvent(video, "loadedmetadata", "Could not load video for export.");
      const safeSegment = normalizeJoinSegmentBounds(
        segment,
        Number.isFinite(video.duration) ? video.duration : segment.sourceEndSec
      );

      if (audioMode === "original" && audioCtx && audioDest) {
        disconnectSegmentElementSource();
        video.volume = 1;
        try {
          segmentElementSource = audioCtx.createMediaElementSource(video);
          segmentElementSource.connect(audioDest);
          if (composed.getAudioTracks().length === 0) {
            audioDest.stream.getAudioTracks().forEach((track) => {
              composed.addTrack(track);
              tracksToStop.push(track);
            });
          }
        } catch (err) {
          audioAttachError =
            err instanceof Error ? err.message : "Could not route segment audio.";
        }
      }

      if (!recorderStarted) {
        recorder.start(250);
        recorderStarted = true;
      }

      await recordVideoSegment(video, canvas, ctx, recorder, safeSegment, drawOptions, {
        segmentIndex: index,
        segmentCount: segments.length,
        signal: options.signal,
        onProgress: (segmentIndex, segmentCount, localProgress) => {
          const overall = (segmentIndex + localProgress) / segmentCount;
          options.onProgress?.(overall);
        },
      });
      video.pause();
      disconnectSegmentElementSource();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    }

    disconnectSegmentElementSource();

    stopMediaRecorderSafely(recorder);

    const blob = await Promise.race([
      recorded,
      new Promise<Blob>((_, reject) => {
        window.setTimeout(
          () => reject(new Error("Export timed out while finalizing the video file.")),
          30_000
        );
      }),
    ]);
    if (!blob.size) throw new Error("Export produced an empty video.");

    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const base = segments[0]?.file.name.replace(/\.[^.]+$/, "") || "gigaedit-joined";
    const result = {
      file: new File([blob], `${base}-joined.${ext}`, { type: mimeType }),
      durationSec: totalDurationSec,
    };
    if (audioMode === "original" && composed.getAudioTracks().length === 0 && audioAttachError) {
      console.warn(`Joined export is video-only: ${audioAttachError}`);
    }
    return result;
  } finally {
    tracksToStop.forEach((track) => {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    });
    void audioCtx?.close().catch(() => undefined);
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
