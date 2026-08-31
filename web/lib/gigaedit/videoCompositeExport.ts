/**
 * Multi-layer timeline compositing for GigaEdit export.
 * Composites main track + overlay videos with transforms (non-destructive bake).
 */

import { aspectRatioSize } from "@/lib/gigaedit/exportFormats";
import { roundToFrame, DEFAULT_TIMELINE_FPS } from "@/lib/gigaedit/frameTime";
import {
  mainClipAtTimelineSec,
  overlaysAtTimelineSec,
  sortedMainVideoClips as getMainClips,
  sortedOverlayClips,
  timelineSecToClipSourceSec,
} from "@/lib/gigaedit/timelineLayers";
import { detectDeviceTier, getExportMaxEdge, type DeviceTier } from "@/lib/gigaedit/deviceCapability";
import type { ExportAspectRatio, GigaEditTimelineClip } from "@/lib/gigaedit/types";
import { coverDrawRect } from "@/lib/gigasocial/photoMusicVideo";
import type { JoinedVideoSegment } from "@/lib/gigaedit/videoExport";

export type CompositeClipSource = {
  clip: GigaEditTimelineClip;
  file: File;
};

export type CompositeExportOptions = {
  clips: GigaEditTimelineClip[];
  resolveFile: (clip: GigaEditTimelineClip) => File | null;
  aspectRatio: ExportAspectRatio;
  durationSec: number;
  globalRotateDeg?: number;
  globalCropScale?: number;
  globalFilterCss?: string;
  overlayText?: string;
  captions?: string;
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

async function seekVideo(video: HTMLVideoElement, sec: number): Promise<void> {
  const target = roundToFrame(Math.max(0, sec));
  if (Math.abs(video.currentTime - target) < 0.04) return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    video.onseeked = done;
    window.setTimeout(done, 600);
    try {
      video.currentTime = target;
    } catch {
      done();
    }
  });
}

function applyMaskPath(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  clip: GigaEditTimelineClip
) {
  const shape = clip.maskShape ?? "none";
  if (shape === "none") return;
  ctx.beginPath();
  if (shape === "circle" || shape === "ellipse") {
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else {
    const r = shape === "rounded" ? Math.min(w, h) * 0.12 : 0;
    if (r > 0 && typeof (ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect === "function") {
      (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(0, 0, w, h, r);
    } else {
      ctx.rect(0, 0, w, h);
    }
  }
  ctx.clip();
}

function drawClipFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  clip: GigaEditTimelineClip,
  canvasW: number,
  canvasH: number,
  asBackground: boolean,
  globalRotateDeg: number,
  globalCropScale: number,
  globalFilterCss: string
) {
  const vw = video.videoWidth || canvasW;
  const vh = video.videoHeight || canvasH;
  const cropL = (clip.cropLeft ?? 0) * vw;
  const cropT = (clip.cropTop ?? 0) * vh;
  const cropR = (clip.cropRight ?? 0) * vw;
  const cropB = (clip.cropBottom ?? 0) * vh;
  const sw = Math.max(1, vw - cropL - cropR);
  const sh = Math.max(1, vh - cropT - cropB);

  ctx.save();
  ctx.globalAlpha = clip.opacity ?? 1;
  ctx.globalCompositeOperation = clip.blendMode ?? "source-over";

  if (asBackground) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.rotate(((globalRotateDeg + (clip.rotateDeg ?? 0)) * Math.PI) / 180);
    ctx.scale(globalCropScale, globalCropScale);
    ctx.filter = globalFilterCss || "none";
    const cover = coverDrawRect(sw, sh, canvasW, canvasH);
    ctx.drawImage(
      video,
      cropL + cover.sx * (sw / cover.sw),
      cropT + cover.sy * (sh / cover.sh),
      cover.sw,
      cover.sh,
      -canvasW / 2,
      -canvasH / 2,
      canvasW,
      canvasH
    );
    ctx.restore();
    return;
  }

  const mode = clip.resizeMode ?? "contain";
  const baseScale = clip.scaleX ?? 1;
  const boxW = canvasW * baseScale * (mode === "original" ? 0.6 : 0.45);
  const boxH = canvasH * (clip.scaleY ?? baseScale) * (mode === "original" ? 0.6 : 0.45);
  const px = (clip.posX ?? 0.5) * canvasW;
  const py = (clip.posY ?? 0.5) * canvasH;

  ctx.translate(px, py);
  ctx.rotate(((clip.rotateDeg ?? 0) * Math.PI) / 180);
  ctx.filter = globalFilterCss && clip.filterId === "none" ? "none" : globalFilterCss || "none";

  const drawW = mode === "cover" || mode === "fill" ? boxW * 1.1 : boxW;
  const drawH = mode === "cover" || mode === "fill" ? boxH * 1.1 : boxH;

  applyMaskPath(ctx, drawW, drawH, clip);
  ctx.drawImage(video, cropL, cropT, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);

  if ((clip.borderWidth ?? 0) > 0) {
    ctx.strokeStyle = clip.borderColor ?? "#fff";
    ctx.lineWidth = clip.borderWidth ?? 2;
    ctx.strokeRect(-drawW / 2, -drawH / 2, drawW, drawH);
  }

  ctx.restore();
}

function drawTextOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlayText: string,
  captionLine: string
) {
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
}

async function loadVideoElement(file: File): Promise<HTMLVideoElement> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.muted = true;
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Could not load video."));
  });
  return video;
}

export function timelineNeedsCompositeExport(clips: GigaEditTimelineClip[]): boolean {
  if (sortedOverlayClips(clips).length > 0) return true;
  return clips.some(
    (c) =>
      c.track === "video" &&
      (c.maskShape === "circle" ||
        c.maskShape === "rectangle" ||
        c.maskShape === "rounded" ||
        c.maskShape === "ellipse" ||
        (c.brandingAction && c.brandingAction !== "keep"))
  );
}

export async function exportCompositedTimeline(
  options: CompositeExportOptions
): Promise<{ file: File; durationSec: number }> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Video export is not supported in this environment.");
  }

  const tier = options.tier ?? detectDeviceTier();
  const target = aspectRatioSize(options.aspectRatio);
  const { width, height } = fitExportSize(target.width, target.height, tier);
  const durationSec = roundToFrame(options.durationSec);
  const fps = DEFAULT_TIMELINE_FPS;
  const frameCount = Math.max(1, Math.ceil(durationSec * fps));
  const globalRotate = options.globalRotateDeg ?? 0;
  const globalCrop = options.globalCropScale ?? 1;
  const globalFilter = options.globalFilterCss && options.globalFilterCss !== "none" ? options.globalFilterCss : "";
  const overlay = options.overlayText?.trim() || "";
  const captionLine =
    options.captions?.trim().split("\n").filter(Boolean).slice(0, 2).join(" · ") || "";

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create export canvas.");

  const videoCache = new Map<string, HTMLVideoElement>();
  const getVideo = async (clip: GigaEditTimelineClip) => {
    const key = clip.sourceKey ?? clip.id;
    if (videoCache.has(key)) return videoCache.get(key)!;
    const file = options.resolveFile(clip);
    if (!file) throw new Error(`Missing source for ${clip.label}`);
    const el = await loadVideoElement(file);
    videoCache.set(key, el);
    return el;
  };

  const canvasStream = canvas.captureStream(fps);
  const mimeType = pickRecorderMimeType();
  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: tier === "low" ? 2_500_000 : 5_000_000,
  });
  const chunks: BlobPart[] = [];
  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Composite export failed."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
  });

  recorder.start(200);

  try {
    for (let frame = 0; frame < frameCount; frame += 1) {
      if (options.signal?.aborted) throw new Error("Export cancelled.");
      const t = roundToFrame(frame / fps);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      const mainClip = mainClipAtTimelineSec(options.clips, t);
      if (mainClip) {
        const mainVideo = await getVideo(mainClip);
        const sourceT = timelineSecToClipSourceSec(mainClip, t);
        await seekVideo(mainVideo, sourceT);
        drawClipFrame(ctx, mainVideo, mainClip, width, height, true, globalRotate, globalCrop, globalFilter);
      }

      for (const overlay of overlaysAtTimelineSec(options.clips, t)) {
        const ovVideo = await getVideo(overlay);
        const sourceT = timelineSecToClipSourceSec(overlay, t);
        await seekVideo(ovVideo, sourceT);
        drawClipFrame(ctx, ovVideo, overlay, width, height, false, 0, 1, "");
      }

      drawTextOverlays(ctx, width, height, overlay, captionLine);
      options.onProgress?.((frame + 1) / frameCount);
      await new Promise((r) => window.setTimeout(r, 0));
    }

    recorder.stop();
    const blob = await recorded;
    if (!blob.size) throw new Error("Export produced an empty video.");
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const mainFile = options.resolveFile(getMainClips(options.clips)[0] ?? options.clips[0]);
    const base = mainFile?.name.replace(/\.[^.]+$/, "") || "gigaedit-composite";
    return { file: new File([blob], `${base}-composite.${ext}`, { type: mimeType }), durationSec };
  } finally {
    for (const video of videoCache.values()) {
      const src = video.src;
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
    }
    canvasStream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    });
  }
}

/** Build main-track segments for sequential join export (layer 0 only). */
export function mainTrackSegments(
  clips: GigaEditTimelineClip[],
  resolveFile: (clip: GigaEditTimelineClip) => File | null
): JoinedVideoSegment[] {
  return getMainClips(clips)
    .map((clip) => {
      const file = resolveFile(clip);
      if (!file) return null;
      return {
        file,
        sourceStartSec: clip.sourceStartSec ?? 0,
        sourceEndSec: clip.sourceEndSec ?? clip.endSec - clip.startSec,
        speed: clip.speed ?? 1,
      };
    })
    .filter(Boolean) as JoinedVideoSegment[];
}
