import { ValidationError } from "./securityErrors";

export const MAX_ATTACHMENT_TEXT_BYTES = 18_000;
export const MAX_INLINE_IMAGE_BYTES = 12 * 1024 * 1024;

export const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type AttachmentKind =
  | "image"
  | "document"
  | "archive"
  | "spreadsheet"
  | "presentation"
  | "pdf"
  | "text";

export type RawAttachmentInput = {
  kind: AttachmentKind;
  name: string;
  mimeType?: string;
  sizeBytes: number;
  text?: string;
  dataUrl?: string;
};

export type ValidatedAttachmentFile = {
  kind: AttachmentKind;
  name: string;
  mimeType?: string;
  /** Server-measured bytes used for quota enforcement */
  sizeBytes: number;
};

export type ValidatedAttachment = RawAttachmentInput & {
  measuredPayloadBytes: number;
};

const BLOCKED_NAME_EXTENSIONS =
  /\.(exe|dll|bat|cmd|com|scr|ps1|vbs|js|mjs|cjs|jar|apk|ipa|dmg|pkg|deb|rpm|sh|zsh|bash|msi)$/i;

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function parseDataUrl(
  dataUrl: string
): { mimeType: string; data: string; decodedBytes: Uint8Array } | null {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl.trim());
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const base64 = match[2].replace(/\s/g, "");
  if (!base64 || base64.length % 4 === 1) return null;
  try {
    const binary = atob(base64);
    const decodedBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      decodedBytes[i] = binary.charCodeAt(i);
    }
    return { mimeType, data: base64, decodedBytes };
  } catch {
    return null;
  }
}

export function sanitizeAttachmentName(name: string): string {
  return (
    name
      .replace(/[/\\]+/g, " ")
      .replace(/[\r\n<>]/g, " ")
      .trim()
      .slice(0, 120) || "attachment"
  );
}

function measurePayloadBytes(attachment: RawAttachmentInput): number {
  if (attachment.dataUrl) {
    const parsed = parseDataUrl(attachment.dataUrl);
    if (!parsed) {
      throw new ValidationError("Invalid attachment data");
    }
    return parsed.decodedBytes.length;
  }
  if (attachment.text) {
    return utf8ByteLength(attachment.text);
  }
  return 0;
}

function validateImageAttachment(
  attachment: RawAttachmentInput,
  payloadBytes: number,
  maxFileBytes: number
): void {
  if (!attachment.dataUrl) {
    throw new ValidationError("Invalid attachment data");
  }
  const parsed = parseDataUrl(attachment.dataUrl);
  if (!parsed) {
    throw new ValidationError("Invalid attachment data");
  }
  const mime = (attachment.mimeType ?? parsed.mimeType).toLowerCase();
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(mime)) {
    throw new ValidationError("Unsupported image format");
  }
  if (payloadBytes > MAX_INLINE_IMAGE_BYTES) {
    throw new ValidationError("Attachment exceeds size limit");
  }
  if (payloadBytes > maxFileBytes) {
    throw new ValidationError("Attachment exceeds size limit");
  }
  if (payloadBytes !== attachment.sizeBytes) {
    throw new ValidationError("Attachment size mismatch");
  }
}

function validateTextAttachment(
  attachment: RawAttachmentInput,
  payloadBytes: number,
  maxFileBytes: number
): void {
  if (payloadBytes > MAX_ATTACHMENT_TEXT_BYTES) {
    throw new ValidationError("Attachment text exceeds size limit");
  }
  if (attachment.sizeBytes > maxFileBytes) {
    throw new ValidationError("Attachment exceeds size limit");
  }
  if (payloadBytes > attachment.sizeBytes) {
    throw new ValidationError("Attachment size mismatch");
  }
}

function validateDocumentAttachment(
  attachment: RawAttachmentInput,
  payloadBytes: number,
  maxFileBytes: number
): void {
  if (attachment.sizeBytes > maxFileBytes) {
    throw new ValidationError("Attachment exceeds size limit");
  }
  if (payloadBytes > attachment.sizeBytes) {
    throw new ValidationError("Attachment size mismatch");
  }
  if (payloadBytes > MAX_ATTACHMENT_TEXT_BYTES && !attachment.dataUrl) {
    throw new ValidationError("Attachment text exceeds size limit");
  }
}

export function validateAttachment(
  attachment: RawAttachmentInput,
  maxFileBytes: number
): ValidatedAttachment {
  const name = sanitizeAttachmentName(attachment.name);
  if (BLOCKED_NAME_EXTENSIONS.test(name)) {
    throw new ValidationError("File type not allowed");
  }
  if (
    !Number.isFinite(attachment.sizeBytes) ||
    attachment.sizeBytes < 0 ||
    attachment.sizeBytes > maxFileBytes
  ) {
    throw new ValidationError("Attachment exceeds size limit");
  }

  const payloadBytes = measurePayloadBytes(attachment);

  if (attachment.kind === "image") {
    validateImageAttachment(attachment, payloadBytes, maxFileBytes);
  } else if (attachment.kind === "text") {
    validateTextAttachment(attachment, payloadBytes, maxFileBytes);
  } else {
    validateDocumentAttachment(attachment, payloadBytes, maxFileBytes);
  }

  return {
    ...attachment,
    name,
    measuredPayloadBytes: payloadBytes,
  };
}

export function validateAttachments(
  attachments: RawAttachmentInput[],
  maxFileBytes: number
): ValidatedAttachment[] {
  return attachments.map((attachment) => validateAttachment(attachment, maxFileBytes));
}

export function toUploadRecordFiles(
  attachments: ValidatedAttachment[]
): ValidatedAttachmentFile[] {
  return attachments.map((attachment) => ({
    kind: attachment.kind,
    name: attachment.name,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
  }));
}

export function sanitizeFeedbackNote(note: string | undefined): string | undefined {
  if (!note) return undefined;
  const cleaned = note
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 500);
  return cleaned || undefined;
}
