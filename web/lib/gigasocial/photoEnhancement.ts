import { getCameraFilterCss, type CameraFilterId } from "@/lib/gigasocial/cameraFilters";

/** Bake the selected preview look into the uploaded photo so the feed matches the review. */
export async function applySocialPhotoLook(file: File, filterId: CameraFilterId = "lark"): Promise<File> {
  if (!file.type.startsWith("image/") || filterId === "none") return file;
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
    context.filter = getCameraFilterCss(filterId) ?? "none";
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type === "image/png" ? "image/png" : "image/jpeg", 0.94)
    );
    if (!blob) return file;
    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "-enhanced" + extension, {
      type: blob.type || file.type,
      lastModified: Date.now(),
    });
  } catch {
    // Preserve the original if the device cannot process this image format.
    return file;
  }
}
