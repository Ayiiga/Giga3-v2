/**
 * Apply a subtle creator-grade lift before upload.
 *
 * Processing is serialized to keep mobile memory bounded even when the user
 * selects a full multi-photo batch. Large images are downscaled before
 * encoding; transparent PNG/WebP sources retain an alpha-capable output.
 * The original is always returned if enhancement fails or would exceed the
 * upload precheck budget.
 */
const MAX_EDGE = 2560;
const MAX_OUTPUT_BYTES = 14 * 1024 * 1024;
let enhancementQueue: Promise<void> = Promise.resolve();

export function brightenSocialPhoto(file: File): Promise<File> {
  const task = enhancementQueue.then(() => enhanceSocialPhoto(file));
  enhancementQueue = task.then(() => undefined, () => undefined);
  return task;
}

async function enhanceSocialPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    const preservesAlpha = file.type === "image/png" || file.type === "image/webp";
    const preferredType = file.type === "image/png" ? "image/png" : preservesAlpha ? "image/webp" : "image/jpeg";
    context.filter = "brightness(1.07) contrast(1.035) saturate(1.045)";
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    bitmap = undefined;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, preferredType, 0.9)
    );
    if (!blob || blob.size > MAX_OUTPUT_BYTES) return file;

    // Some browsers do not support WebP canvas encoding and silently return PNG.
    const outputType = blob.type || preferredType;
    if (preservesAlpha && outputType !== "image/png" && outputType !== "image/webp") return file;
    const extension =
      outputType === "image/png" ? ".png" : outputType === "image/webp" ? ".webp" : ".jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], baseName + "-giga" + extension, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
