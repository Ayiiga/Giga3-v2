/** Shared upload filename / extension hardening for social + chat attachments. */

const BLOCKED_EXTENSIONS =
  /\.(exe|dll|bat|cmd|com|scr|ps1|vbs|js|mjs|cjs|jar|apk|ipa|dmg|pkg|deb|rpm|sh|zsh|bash|msi|html|htm|svg|php|asp|aspx|cgi)$/i;

const DANGEROUS_NAME_CHARS = /[\0\r\n<>]|^\.+/;

export function assertSafeUploadFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/[/\\]+/g, " ")
    .replace(/[\r\n<>]/g, " ")
    .trim()
    .slice(0, 120);

  if (!cleaned) {
    throw new Error("Invalid file name.");
  }
  if (DANGEROUS_NAME_CHARS.test(cleaned) || cleaned.includes("..")) {
    throw new Error("Invalid file name.");
  }
  if (BLOCKED_EXTENSIONS.test(cleaned)) {
    throw new Error("This file type is not allowed for security reasons.");
  }
  return cleaned;
}

/** JPEG / PNG / WEBP magic-byte sniff (best-effort; optional for signed uploads). */
export function looksLikeAllowedImageBytes(bytes: Uint8Array | undefined): boolean {
  if (!bytes || bytes.length < 12) return false;
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return true;
  }
  // WEBP (RIFF....WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }
  return false;
}
