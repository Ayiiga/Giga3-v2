import type { GigaDocument } from "@/lib/documents/types";
import { slugFilename } from "@/lib/documents/model";
import { exportDocumentPdf } from "@/lib/documents/exportPdf";
import { exportDocumentDocx } from "@/lib/documents/exportDocx";

export type DocumentExportFormat = "pdf" | "docx";

function triggerDownload(bytes: Uint8Array, filename: string, mime: string): void {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadDocumentExport(
  doc: GigaDocument,
  format: DocumentExportFormat
): Promise<{ filename: string }> {
  if (format === "pdf") {
    const bytes = await exportDocumentPdf(doc);
    const filename = slugFilename(doc.title.replace(/\s+/g, "_"), "pdf");
    triggerDownload(bytes, filename, "application/pdf");
    return { filename };
  }
  const bytes = await exportDocumentDocx(doc);
  const filename = slugFilename(doc.title.replace(/\s+/g, "_"), "docx");
  triggerDownload(
    bytes,
    filename,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  return { filename };
}

export async function shareDocumentFile(
  doc: GigaDocument,
  format: DocumentExportFormat
): Promise<"shared" | "downloaded"> {
  const bytes =
    format === "pdf" ? await exportDocumentPdf(doc) : await exportDocumentDocx(doc);
  const filename = slugFilename(
    doc.title.replace(/\s+/g, "_"),
    format === "pdf" ? "pdf" : "docx"
  );
  const mime =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const file = new File([bytes], filename, { type: mime });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: doc.title });
    return "shared";
  }
  triggerDownload(bytes, filename, mime);
  return "downloaded";
}
