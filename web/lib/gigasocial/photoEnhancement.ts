/**
 * Apply a subtle creator-grade lift before upload so the published image
 * matches the bright, polished preview. The source is preserved on failure.
 */
export async function brightenSocialPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.filter = "brightness(1.07) contrast(1.035) saturate(1.045)";
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, 0.94)
    );
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const extension = outputType === "image/png" ? ".png" : ".jpg";
    return new File([blob], baseName + "-giga" + extension, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
