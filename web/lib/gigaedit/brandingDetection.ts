import type { GigaEditBrandKit } from "@/lib/gigaedit/creatorStudio/brandKit";
import type { BrandingSource } from "@/lib/gigaedit/types";

export type BrandingRegion = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type BrandingDetection = {
  id: string;
  source: BrandingSource;
  region: BrandingRegion;
  confidence: number;
  label: string;
};

type CornerId = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const CORNERS: CornerId[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

function cornerRegion(corner: CornerId): BrandingRegion {
  switch (corner) {
    case "top-left":
      return { x: 0, y: 0, w: 0.22, h: 0.16 };
    case "top-right":
      return { x: 0.78, y: 0, w: 0.22, h: 0.16 };
    case "bottom-left":
      return { x: 0, y: 0.84, w: 0.22, h: 0.16 };
    case "bottom-right":
      return { x: 0.78, y: 0.84, w: 0.22, h: 0.16 };
  }
}

function sampleRegionAverage(data: ImageData, region: BrandingRegion): number[] {
  const { width, height, data: px } = data;
  const x0 = Math.floor(region.x * width);
  const y0 = Math.floor(region.y * height);
  const x1 = Math.min(width, Math.ceil((region.x + region.w) * width));
  const y1 = Math.min(height, Math.ceil((region.y + region.h) * height));
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4;
      r += px[i];
      g += px[i + 1];
      b += px[i + 2];
      count += 1;
    }
  }
  if (count === 0) return [0, 0, 0];
  return [r / count, g / count, b / count];
}

function regionVariance(data: ImageData, region: BrandingRegion): number {
  const { width, height, data: px } = data;
  const x0 = Math.floor(region.x * width);
  const y0 = Math.floor(region.y * height);
  const x1 = Math.min(width, Math.ceil((region.x + region.w) * width));
  const y1 = Math.min(data.height, Math.ceil((region.y + region.h) * data.height));
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4;
      const lum = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
      sum += lum;
      sumSq += lum * lum;
      count += 1;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

async function logoPatchFromDataUrl(dataUrl: string): Promise<number[] | null> {
  if (typeof document === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, 16, 16);
      const data = ctx.getImageData(0, 0, 16, 16).data;
      const avg = [0, 0, 0];
      for (let i = 0; i < data.length; i += 4) {
        avg[0] += data[i];
        avg[1] += data[i + 1];
        avg[2] += data[i + 2];
      }
      const n = data.length / 4;
      resolve([avg[0] / n, avg[1] / n, avg[2] / n]);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function colorDistance(a: number[], b: number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/**
 * Honest corner-sampling branding detection.
 * Never claims third-party removal — unknown marks stay user-confirmed.
 */
export async function detectBrandingFromImageData(
  image: ImageData,
  brandKit?: Pick<GigaEditBrandKit, "logoDataUrl" | "watermarkText" | "name">
): Promise<BrandingDetection[]> {
  const results: BrandingDetection[] = [];
  const logoAvg = brandKit?.logoDataUrl ? await logoPatchFromDataUrl(brandKit.logoDataUrl) : null;

  for (const corner of CORNERS) {
    const region = cornerRegion(corner);
    const variance = regionVariance(image, region);
    if (variance < 120) continue;
    const avg = sampleRegionAverage(image, region);
    let source: BrandingSource = "unknown";
    let confidence = Math.min(0.85, variance / 2000);
    let label = "Visual mark (unknown)";

    if (logoAvg && colorDistance(avg, logoAvg) < 55) {
      source = "user";
      confidence = Math.min(0.95, confidence + 0.25);
      label = brandKit?.name ? `Your brand (${brandKit.name})` : "Your registered logo";
    } else if (brandKit?.watermarkText?.trim()) {
      label = "Possible watermark area";
    }

    results.push({
      id: `brand_${corner}`,
      source,
      region,
      confidence,
      label,
    });
  }

  return results;
}

export function shouldAutoCleanUserBranding(
  detection: BrandingDetection,
  autoCleanEnabled: boolean
): boolean {
  return autoCleanEnabled && detection.source === "user" && detection.confidence >= 0.5;
}
