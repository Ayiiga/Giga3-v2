/** Resize/compress images before chat upload — critical on slow mobile networks. */

export type CompressedImage = {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not compress image."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

function fitDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function drawToCanvas(
  img: HTMLImageElement,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image canvas.");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export async function compressImageFile(
  file: File,
  options: {
    maxDimension: number;
    quality: number;
    maxBytes?: number;
    mimeType?: string;
  }
): Promise<CompressedImage> {
  const img = await loadImageFromFile(file);
  const targetMime =
    options.mimeType ??
    (file.type === "image/png" ? "image/png" : "image/jpeg");
  const { width, height } = fitDimensions(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    options.maxDimension
  );
  const canvas = await drawToCanvas(img, width, height);

  let quality = options.quality;
  let blob = await canvasToBlob(canvas, targetMime, quality);
  const maxBytes = options.maxBytes;
  if (maxBytes && blob.size > maxBytes && targetMime === "image/jpeg") {
    for (let attempt = 0; attempt < 4 && blob.size > maxBytes; attempt += 1) {
      quality = Math.max(0.45, quality - 0.12);
      blob = await canvasToBlob(canvas, targetMime, quality);
    }
  }

  return { blob, mimeType: targetMime, width, height };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read image data."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(blob);
  });
}
