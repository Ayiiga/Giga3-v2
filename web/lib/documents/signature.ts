const SIGNATURE_PREFIX = "data:image/png;base64,";
const PNG_MAGIC = [137, 80, 78, 71, 13, 10, 26, 10];

export function signatureImageBytes(dataUrl: string): Uint8Array {
  if (!dataUrl.startsWith(SIGNATURE_PREFIX) || dataUrl.length > 160_000) {
    throw new Error("Invalid handwritten signature. Draw it again before exporting.");
  }
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(dataUrl.slice(SIGNATURE_PREFIX.length)), (byte) => byte.charCodeAt(0));
  } catch {
    throw new Error("Invalid handwritten signature. Draw it again before exporting.");
  }
  if (bytes.length < 24 || !PNG_MAGIC.every((byte, index) => bytes[index] === byte)) {
    throw new Error("Invalid handwritten signature. Draw it again before exporting.");
  }
  return bytes;
}

export const SIGNATURE_CANVAS = { width: 640, height: 240 } as const;
