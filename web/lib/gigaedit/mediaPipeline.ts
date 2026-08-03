/**
 * Memory-aware preview/export helpers for GigaEdit.
 * Always leaves original File/Blob untouched.
 */

import {
  detectDeviceTier,
  getExportMaxEdge,
  getPreviewMaxEdge,
  type DeviceTier,
} from "@/lib/gigaedit/deviceCapability";
import { analyzeImageData, type FrameAnalysis } from "@/lib/gigaedit/cameraLook";
import { aspectRatioSize } from "@/lib/gigaedit/exportFormats";
import type { ExportAspectRatio } from "@/lib/gigaedit/types";
import { coverDrawRect } from "@/lib/gigasocial/photoMusicVideo";

export function createManagedObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeManagedObjectUrl(url: string | null | undefined): void {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function sourceToBitmap(
  source: CanvasImageSource | ImageBitmap
): Promise<ImageBitmap | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement> {
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) return source;
  if (typeof createImageBitmap === "function") {
    try {
      if (
        source instanceof HTMLImageElement ||
        source instanceof HTMLVideoElement ||
        source instanceof HTMLCanvasElement ||
        source instanceof Blob
      ) {
        return await createImageBitmap(source as ImageBitmapSource);
      }
    } catch {
      /* fall through */
    }
  }
  return source as HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
}

type Filterable2DContext = (CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) & {
  filter: string;
};

function drawScaled(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  filter: string
) {
  const filterCtx = ctx as Filterable2DContext;
  filterCtx.clearRect(0, 0, width, height);
  filterCtx.filter = filter && filter !== "none" ? filter : "none";
  filterCtx.drawImage(source, 0, 0, width, height);
  filterCtx.filter = "none";
}

/** Analyze luminance from an image/video element without mutating it. */
export async function analyzeMediaElement(
  el: HTMLImageElement | HTMLVideoElement,
  tier: DeviceTier = detectDeviceTier()
): Promise<FrameAnalysis> {
  const naturalW =
    el instanceof HTMLVideoElement ? el.videoWidth || 320 : el.naturalWidth || 320;
  const naturalH =
    el instanceof HTMLVideoElement ? el.videoHeight || 180 : el.naturalHeight || 180;
  const { width, height } = fitWithin(naturalW, naturalH, Math.min(480, getPreviewMaxEdge(tier)));

  try {
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return { luminance: 0.5, warmth: 0, sampledAt: Date.now() };
      drawScaled(ctx, el, width, height, "none");
      const data = ctx.getImageData(0, 0, width, height);
      return analyzeImageData(data, tier === "low" ? 16 : 10);
    }
  } catch {
    /* DOM canvas fallback */
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { luminance: 0.5, warmth: 0, sampledAt: Date.now() };
  drawScaled(ctx, el, width, height, "none");
  return analyzeImageData(ctx.getImageData(0, 0, width, height), tier === "low" ? 16 : 10);
}

export type RenderImageOptions = {
  filterCss: string;
  maxEdge?: number;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  quality?: number;
  overlayText?: string;
  tier?: DeviceTier;
  /** When set, cover-crop into this frame before export. */
  aspectRatio?: ExportAspectRatio;
};

/**
 * Render an edited image blob. Original element/file is never overwritten.
 * Caps dimensions by device tier for faster export on low-end devices.
 */
export async function renderEditedImageBlob(
  img: HTMLImageElement,
  options: RenderImageOptions
): Promise<Blob | null> {
  const tier = options.tier ?? detectDeviceTier();
  const maxEdge = options.maxEdge ?? getExportMaxEdge(tier);
  const naturalW = img.naturalWidth || 1080;
  const naturalH = img.naturalHeight || 1080;
  let width: number;
  let height: number;
  if (options.aspectRatio) {
    const target = aspectRatioSize(options.aspectRatio);
    const fitted = fitWithin(target.width, target.height, maxEdge);
    width = fitted.width;
    height = fitted.height;
  } else {
    const fitted = fitWithin(naturalW, naturalH, maxEdge);
    width = fitted.width;
    height = fitted.height;
  }
  const mime = options.mimeType ?? "image/png";
  const quality = options.quality ?? (tier === "low" ? 0.88 : 0.92);

  const bitmap = await sourceToBitmap(img);

  const paint = (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    const filterCtx = ctx as Filterable2DContext;
    filterCtx.clearRect(0, 0, w, h);
    filterCtx.fillStyle = "#000";
    filterCtx.fillRect(0, 0, w, h);
    filterCtx.filter = options.filterCss && options.filterCss !== "none" ? options.filterCss : "none";
    const srcW =
      bitmap instanceof HTMLImageElement
        ? bitmap.naturalWidth || naturalW
        : "width" in bitmap
          ? Number(bitmap.width) || naturalW
          : naturalW;
    const srcH =
      bitmap instanceof HTMLImageElement
        ? bitmap.naturalHeight || naturalH
        : "height" in bitmap
          ? Number(bitmap.height) || naturalH
          : naturalH;
    const cover = coverDrawRect(srcW, srcH, w, h);
    filterCtx.drawImage(
      bitmap as CanvasImageSource,
      cover.sx,
      cover.sy,
      cover.sw,
      cover.sh,
      0,
      0,
      w,
      h
    );
    filterCtx.filter = "none";
    if (options.overlayText?.trim()) {
      const text = options.overlayText.trim();
      filterCtx.fillStyle = "rgba(11,18,32,0.55)";
      filterCtx.fillRect(0, h * 0.72, w, h * 0.28);
      filterCtx.fillStyle = "#fbbf24";
      filterCtx.font = `bold ${Math.max(28, Math.floor(w * 0.06))}px system-ui,sans-serif`;
      filterCtx.textAlign = "center";
      filterCtx.fillText(text, w / 2, h * 0.88);
    }
  };

  try {
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      paint(ctx, width, height);
      if (typeof bitmap !== "undefined" && "close" in bitmap && typeof bitmap.close === "function") {
        try {
          bitmap.close();
        } catch {
          /* */
        }
      }
      return await canvas.convertToBlob({ type: mime, quality });
    }
  } catch {
    /* DOM fallback */
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paint(ctx, width, height);
  if (typeof bitmap !== "undefined" && "close" in bitmap && typeof bitmap.close === "function") {
    try {
      bitmap.close();
    } catch {
      /* */
    }
  }
  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), mime, quality)
  );
}

/** Schedule non-urgent work without blocking interaction. */
export function scheduleIdleWork(fn: () => void, timeout = 800): () => void {
  if (typeof window === "undefined") {
    fn();
    return () => undefined;
  }
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }
  ).requestIdleCallback;
  if (typeof ric === "function") {
    const id = ric(fn, { timeout });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, Math.min(48, timeout / 4));
  return () => window.clearTimeout(id);
}

export function getPreviewMaxEdgeForTier(tier?: DeviceTier): number {
  return getPreviewMaxEdge(tier ?? detectDeviceTier());
}
