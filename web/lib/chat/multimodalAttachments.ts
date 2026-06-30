import type JSZip from "jszip";
import { formatCurrentDateShort } from "@/lib/datetime";
import {
  DEFAULT_UPLOAD_LIMITS,
  formatUploadBytes,
  type UploadLimitConfig,
} from "@/lib/chat/uploadLimits";

const MAX_EXTRACTED_CHARS_PER_FILE = 18_000;
const MAX_ARCHIVE_ENTRIES = 12;
const MAX_INLINE_IMAGE_BYTES = 12 * 1024 * 1024;

const TEXT_EXTENSIONS =
  /\.(txt|md|markdown|csv|json|xml|html|htm|yaml|yml|log|rtf|tex)$/i;
const BLOCKED_EXTENSIONS =
  /\.(exe|dll|bat|cmd|com|scr|ps1|vbs|js|mjs|cjs|jar|apk|ipa|dmg|pkg|deb|rpm|sh|zsh|bash|msi)$/i;

export type MultimodalAttachmentKind =
  | "image"
  | "document"
  | "archive"
  | "spreadsheet"
  | "presentation"
  | "pdf"
  | "text";

export type AttachmentKind = "file" | "image" | "video" | "camera";

export interface PreparedChatAttachment {
  kind: MultimodalAttachmentKind;
  name: string;
  mimeType?: string;
  sizeBytes: number;
  text?: string;
  dataUrl?: string;
  previewUrl?: string;
}

export function sanitizeAttachmentName(name: string): string {
  return name
    .replace(/[/\\]+/g, " ")
    .replace(/[\r\n<>]/g, " ")
    .trim()
    .slice(0, 120) || "attachment";
}

function assertAllowedFile(file: File, limits?: UploadLimitConfig): void {
  const safeName = sanitizeAttachmentName(file.name);
  const limit = limits ?? DEFAULT_UPLOAD_LIMITS.free;
  if (BLOCKED_EXTENSIONS.test(safeName)) {
    throw new Error(`${safeName} is blocked for safety. Upload documents, images, or archives only.`);
  }
  if (file.size > limit.maxFileBytes) {
    throw new Error(
      `${safeName} is ${formatUploadBytes(file.size)}. Your ${limit.label} plan allows ${formatUploadBytes(limit.maxFileBytes)} per file.`
    );
  }
}

function isTextFile(file: File): boolean {
  return (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/xml" ||
    TEXT_EXTENSIONS.test(file.name)
  );
}

function classifyFile(file: File): MultimodalAttachmentKind {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return "image";
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (name.endsWith(".docx")) return "document";
  if (name.endsWith(".pptx")) return "presentation";
  if (name.endsWith(".xlsx")) return "spreadsheet";
  if (name.endsWith(".zip")) return "archive";
  if (isTextFile(file)) return "text";
  return "document";
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read file as text."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

function readDataUrl(file: File): Promise<string> {
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
    reader.readAsDataURL(file);
  });
}

function truncateText(text: string, max = MAX_EXTRACTED_CHARS_PER_FILE): string {
  const normalized = text.replace(/\u0000/g, "").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trimEnd()}\n\n[...truncated ${normalized.length - max} characters]`;
}

function xmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<a:br\/>|<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocx(zip: JSZip): Promise<string> {
  const doc = await zip.file("word/document.xml")?.async("text");
  return doc ? xmlToText(doc) : "";
}

async function extractPptx(zip: JSZip): Promise<string> {
  const slides = Object.values(zip.files)
    .filter((file) => /^ppt\/slides\/slide\d+\.xml$/i.test(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .slice(0, 40);
  const texts: string[] = [];
  for (const slide of slides) {
    const text = xmlToText(await slide.async("text"));
    if (text) texts.push(`Slide ${texts.length + 1}: ${text}`);
  }
  return texts.join("\n\n");
}

async function extractXlsx(zip: JSZip): Promise<string> {
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("text");
  const sharedStrings = sharedStringsXml
    ? Array.from(sharedStringsXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((m) =>
        xmlToText(m[1])
      )
    : [];
  const sheets = Object.values(zip.files)
    .filter((file) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .slice(0, 20);
  const rows: string[] = [];
  for (const sheet of sheets) {
    const xml = await sheet.async("text");
    const cells = Array.from(xml.matchAll(/<c[^>]*(?:t="s")?[^>]*>([\s\S]*?)<\/c>/g))
      .slice(0, 800)
      .map((m) => {
        const v = m[1].match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (!v) return "";
        const shared = Number(v);
        return Number.isFinite(shared) && sharedStrings[shared] ? sharedStrings[shared] : v;
      })
      .filter(Boolean);
    if (cells.length) rows.push(`${sheet.name}: ${cells.join(", ")}`);
  }
  return rows.join("\n\n");
}

async function extractZip(file: File, kind: MultimodalAttachmentKind): Promise<string> {
  const { default: JSZipRuntime } = await import("jszip");
  const zip = await JSZipRuntime.loadAsync(file);
  if (kind === "document") return truncateText(await extractDocx(zip));
  if (kind === "presentation") return truncateText(await extractPptx(zip));
  if (kind === "spreadsheet") return truncateText(await extractXlsx(zip));

  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && !BLOCKED_EXTENSIONS.test(entry.name))
    .filter((entry) => TEXT_EXTENSIONS.test(entry.name) || /\.(csv|txt|md|json)$/i.test(entry.name))
    .slice(0, MAX_ARCHIVE_ENTRIES);
  const blocks: string[] = [];
  for (const entry of entries) {
    const text = truncateText(await entry.async("text"), 4_000);
    if (text) blocks.push(`File: ${sanitizeAttachmentName(entry.name)}\n${text}`);
  }
  return blocks.join("\n\n");
}

export async function prepareChatAttachment(
  file: File,
  limits?: UploadLimitConfig
): Promise<PreparedChatAttachment> {
  assertAllowedFile(file, limits);
  const kind = classifyFile(file);
  const name = sanitizeAttachmentName(file.name);
  const base = {
    kind,
    name,
    mimeType: file.type || undefined,
    sizeBytes: file.size,
  };

  if (kind === "image") {
    const canInline = file.size <= Math.min(limits?.maxFileBytes ?? MAX_INLINE_IMAGE_BYTES, MAX_INLINE_IMAGE_BYTES);
    return {
      ...base,
      dataUrl: canInline ? await readDataUrl(file) : undefined,
      previewUrl: URL.createObjectURL(file),
      text:
        "Image attached for visual analysis, OCR, object/scene detection, diagrams, charts, handwritten notes, screenshots, scanned documents, and comparisons.",
    };
  }

  if (kind === "text") {
    return { ...base, text: truncateText(await readTextFile(file)) };
  }

  if (kind === "document" || kind === "presentation" || kind === "spreadsheet" || kind === "archive") {
    try {
      const extracted = await extractZip(file, kind);
      return {
        ...base,
        text: extracted || `${name} attached. No readable text was extracted client-side; analyze metadata and ask for OCR if needed.`,
      };
    } catch {
      return {
        ...base,
        text: `${name} attached. This file could not be extracted safely in the browser; provide OCR or describe the content if analysis requires hidden text.`,
      };
    }
  }

  return {
    ...base,
    text:
      kind === "pdf"
        ? `${name} PDF attached. Extract visible text/OCR where supported; if scanned, analyze as a scanned document and solve/summarize from available content.`
        : `${name} attached for multimodal analysis.`,
  };
}

export function buildMultimodalPrompt(
  message: string,
  attachments: PreparedChatAttachment[]
): string {
  if (!attachments.length) return message;
  const attachmentSummary = attachments
    .map((attachment, index) => {
      const text = attachment.text?.trim()
        ? `\nExtracted/known content:\n${attachment.text.trim()}`
        : "";
      return `Attachment ${index + 1}: ${attachment.name} (${attachment.kind}, ${formatUploadBytes(attachment.sizeBytes)})${text}`;
    })
    .join("\n\n");

  return `${message.trim() || "Analyze the uploaded content."}

---
Uploaded multimodal context (${formatCurrentDateShort()}):
${attachmentSummary}
---

Instructions:
- Analyze every uploaded item automatically.
- Extract text/OCR where possible.
- For exams: detect subject and education level, solve step-by-step, show formulas, reasoning, and final answer.
- If a diagram, graph, circuit, flowchart, geometry sketch, map, or scientific illustration helps, include a Mermaid diagram block or a clear generated diagram description.
- Compare multiple images/files when more than one is uploaded.
- Give practical insights and recommendations.`;
}
