/** CV portrait helpers. Photos are user-selected and processed entirely in the browser. */
export const CV_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const CV_PHOTO_WIDTH = 300;
const CV_PHOTO_HEIGHT = 375;

/** Read an exported, locally processed JPEG. Reject unexpected or oversized data. */
export function passportPhotoBytes(dataUrl: string): Uint8Array {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error("The CV photo must be a valid JPEG.");
  if (match[1].length > 2_000_000) throw new Error("The CV photo is too large.");
  const raw = atob(match[1]);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Make a compact, passport-style 4:5 portrait without changing the face.
 * The user decides whether to upload a picture; no image leaves their device
 * during this step. Original image content is never uploaded automatically.
 */
export async function preparePassportPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png"].includes(file.type))
    throw new Error("Use a JPEG or PNG passport photo.");
  if (file.size === 0 || file.size > CV_PHOTO_MAX_BYTES)
    throw new Error("Choose a photo smaller than 5 MB.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = objectUrl;
    await photo.decode();
    if (!photo.naturalWidth || !photo.naturalHeight || photo.naturalWidth > 8000 || photo.naturalHeight > 8000)
      throw new Error("The photo dimensions are unsupported. Choose a smaller image.");

    const canvas = document.createElement("canvas");
    canvas.width = CV_PHOTO_WIDTH;
    canvas.height = CV_PHOTO_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This device cannot process the photo.");

    const sourceRatio = photo.naturalWidth / photo.naturalHeight;
    const targetRatio = CV_PHOTO_WIDTH / CV_PHOTO_HEIGHT;
    const sourceWidth = sourceRatio > targetRatio ? photo.naturalHeight * targetRatio : photo.naturalWidth;
    const sourceHeight = sourceRatio > targetRatio ? photo.naturalHeight : photo.naturalWidth / targetRatio;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CV_PHOTO_WIDTH, CV_PHOTO_HEIGHT);
    context.drawImage(
      photo,
      (photo.naturalWidth - sourceWidth) / 2,
      (photo.naturalHeight - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      0,
      0,
      CV_PHOTO_WIDTH,
      CV_PHOTO_HEIGHT
    );
    const result = canvas.toDataURL("image/jpeg", 0.84);
    passportPhotoBytes(result);
    return result;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
