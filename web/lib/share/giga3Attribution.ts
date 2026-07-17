import { siteConfig } from "@/lib/site";

/** Canonical PWA / marketing URL for attribution on shares and exports. */
export const GIGA3_APP_URL = siteConfig.url.replace(/\/$/, "");

export const GIGA3_ATTRIBUTION_LINE = `Made with Giga3 AI — ${GIGA3_APP_URL}`;

export const GIGA3_WATERMARK_LABEL = "Giga3 AI · giga3ai.com";

export function hasGiga3Attribution(text: string): boolean {
  return /giga3ai\.com/i.test(text);
}

/** Append a website link when sharing text to other apps or the clipboard. */
export function appendGiga3Attribution(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return GIGA3_ATTRIBUTION_LINE;
  if (hasGiga3Attribution(trimmed)) return trimmed;
  return `${trimmed}\n\n${GIGA3_ATTRIBUTION_LINE}`;
}

export function giga3ShareDefaults(overrides?: {
  title?: string;
  text?: string;
  url?: string;
}): { title: string; text: string; url: string } {
  const url = overrides?.url?.trim() || GIGA3_APP_URL;
  const raw = overrides?.text?.trim() ?? "";
  return {
    title: overrides?.title?.trim() || "Giga3 AI",
    text: appendGiga3Attribution(raw || "Shared from Giga3 AI"),
    url,
  };
}

import { readExportWatermarkPreference } from "@/lib/gigasocial/exportWatermark";
export async function watermarkImageBlob(blob: Blob): Promise<Blob> {
  if (!blob.type.startsWith("image/") || typeof document === "undefined") {
    return blob;
  }

  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return blob;
    }

    ctx.drawImage(bitmap, 0, 0);

    const fontSize = Math.max(11, Math.round(bitmap.width * 0.026));
    const pad = Math.max(6, Math.round(fontSize * 0.45));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    const metrics = ctx.measureText(GIGA3_WATERMARK_LABEL);
    const barW = metrics.width + pad * 2;
    const barH = fontSize + pad * 2;
    const x = bitmap.width - barW - pad;
    const y = bitmap.height - barH - pad;

    ctx.fillStyle = "rgba(15, 23, 42, 0.62)";
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 6);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(GIGA3_WATERMARK_LABEL, x + pad, y + pad + fontSize * 0.82);

    bitmap.close();

    const mime =
      blob.type === "image/png" || blob.type === "image/webp"
        ? blob.type
        : "image/jpeg";

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (watermarked) => {
          if (watermarked) resolve(watermarked);
          else reject(new Error("Watermark failed"));
        },
        mime,
        mime === "image/jpeg" ? 0.92 : undefined
      );
    });
  } catch {
    return blob;
  }
}

export async function prepareImageForGallery(blob: Blob): Promise<Blob> {
  if (!readExportWatermarkPreference()) return blob;
  return watermarkImageBlob(blob);
}
