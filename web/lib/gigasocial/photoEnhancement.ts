/**
 * Apply a subtle creator-grade lift before upload while keeping mobile memory
 * bounded. Large camera images are downscaled before canvas allocation, alpha
 * is retained for PNG/WebP, and the original is returned on any unsafe result.
 */
import { SOCIAL_MAX_IMAGE_BYTES } from "@/lib/gigasocial/constants";

const MAX_EDGE = 2560;
const SAFE_OUTPUT_BYTES = Math.floor(SOCIAL_MAX_IMAGE_BYTES * 0.95);

export async function brightenSocialPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.filter = "brightness(1.07) contrast(1.035) saturate(1.045)";
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    // Keep alpha-capable source formats alpha-capable.
    const sourceType = file.type.toLowerCase();
    const outputType = sourceType === "image/png" || sourceType === "image/webp"
      ? sourceType
      : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, outputType === "image/jpeg" ? 0.88 : undefined)
    );
    if (!blob || blob.size > SAFE_OUTPUT_BYTES) return file;
    const extension = outputType === "image/png" ? ".png" : outputType === "image/webp" ? ".webp" : ".jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}-giga${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
