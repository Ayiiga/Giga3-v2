import { formatCurrentDateShort } from "@/lib/datetime";

const MAX_TEXT_BYTES = 512 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 32 * 1024 * 1024;

export type AttachmentKind = "file" | "image" | "video" | "camera";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assertSize(file: File, maxBytes: number): void {
  if (file.size > maxBytes) {
    throw new Error(
      `"${file.name}" is too large (${formatBytes(file.size)}). Maximum is ${formatBytes(maxBytes)}.`
    );
  }
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file as text."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

const TEXT_EXTENSIONS =
  /\.(txt|md|markdown|csv|json|xml|html|htm|yaml|yml|log|rtf|tex)$/i;

export function isLikelyTextFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  if (
    file.type === "application/json" ||
    file.type === "application/xml" ||
    file.type === "application/javascript"
  ) {
    return true;
  }
  return TEXT_EXTENSIONS.test(file.name);
}

/** Client-side only — prepends attachment context as plain text for existing chat API. */
export async function buildAttachmentMessage(
  file: File,
  kind: AttachmentKind
): Promise<string> {
  const safeName = file.name.replace(/[\r\n<>]/g, " ").trim() || "attachment";

  if (kind === "file") {
    assertSize(file, MAX_TEXT_BYTES);
    if (!isLikelyTextFile(file)) {
      return `[Uploaded file: ${safeName} (${formatBytes(file.size)}, type: ${file.type || "unknown"})]\n\nPlease help me work with this file. I've described what I need below:\n\n`;
    }
    const raw = await readTextFile(file);
    const trimmed = raw.trim();
    if (!trimmed) {
      return `[Uploaded file: ${safeName} — empty or unreadable]\n\n`;
    }
    const maxChars = 12_000;
    const body =
      trimmed.length > maxChars
        ? `${trimmed.slice(0, maxChars)}\n\n[…truncated ${trimmed.length - maxChars} characters]`
        : trimmed;
    return `--- Uploaded file: ${safeName} (${formatCurrentDateShort()}) ---\n${body}\n--- End of file ---\n\n`;
  }

  if (kind === "image" || kind === "camera") {
    assertSize(file, MAX_IMAGE_BYTES);
    const source = kind === "camera" ? "Camera photo" : "Image";
    return `[${source}: ${safeName} (${formatBytes(file.size)})]\n\nDescribe what you need help with regarding this image below. If relevant, include goals such as editing, captioning, OCR, or analysis:\n\n`;
  }

  assertSize(file, MAX_VIDEO_BYTES);
  return `[Video: ${safeName} (${formatBytes(file.size)})]\n\nDescribe what you need help with regarding this video below (summary, script, editing notes, etc.):\n\n`;
}
