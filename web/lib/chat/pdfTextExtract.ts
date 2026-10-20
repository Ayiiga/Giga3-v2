/**
 * Client-side PDF text extraction for chat attachments.
 * Uses pdfjs-dist; scanned/image-only PDFs return empty text (caller should say so).
 */

const MAX_PAGES = 40;
const MAX_CHARS = 18_000;

export type PdfExtractResult = {
  text: string;
  pageCount: number;
  pagesWithText: number;
  truncated: boolean;
};

function normalizePdfText(raw: string): string {
  return raw
    .replace(/\u0000/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract readable text layer from a PDF File/Blob.
 * Does not perform OCR — image-only pages contribute nothing.
 */
export async function extractPdfText(
  file: Blob,
  options?: { maxPages?: number; maxChars?: number }
): Promise<PdfExtractResult> {
  const maxPages = options?.maxPages ?? MAX_PAGES;
  const maxChars = options?.maxChars ?? MAX_CHARS;
  const data = new Uint8Array(await file.arrayBuffer());

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Text extraction does not need a dedicated worker thread in the browser chat path.
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = "";
  }

  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const parts: string[] = [];
  let pagesWithText = 0;
  let total = 0;
  let truncated = false;

  const limit = Math.min(pageCount, maxPages);
  for (let pageNum = 1; pageNum <= limit; pageNum += 1) {
    if (total >= maxChars) {
      truncated = true;
      break;
    }
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = normalizePdfText(
      content.items
        .map((item: { str?: string }) => (typeof item.str === "string" ? item.str : ""))
        .join(" ")
    );
    if (pageText) {
      pagesWithText += 1;
      const block = `--- Page ${pageNum} ---\n${pageText}`;
      const room = maxChars - total;
      if (block.length > room) {
        parts.push(block.slice(0, room).trimEnd());
        total = maxChars;
        truncated = true;
        break;
      }
      parts.push(block);
      total += block.length + 2;
    }
  }

  if (pageCount > maxPages) truncated = true;

  return {
    text: parts.join("\n\n"),
    pageCount,
    pagesWithText,
    truncated,
  };
}

export function formatPdfAttachmentText(
  name: string,
  result: PdfExtractResult
): string {
  if (!result.text || result.pagesWithText === 0) {
    return (
      `${name} PDF attached (${result.pageCount} page${result.pageCount === 1 ? "" : "s"}). ` +
      `No extractable text layer was found — this may be a scanned/image-only PDF. ` +
      `Do not invent page content. Ask the user to upload clearer page images or a text-based PDF if analysis requires reading the document.`
    );
  }
  const truncNote = result.truncated
    ? `\n\n[...truncated after ~${MAX_CHARS} characters / first ${MAX_PAGES} pages; ${result.pageCount} pages total]`
    : `\n\n[${result.pageCount} pages; ${result.pagesWithText} with text]`;
  return `Extracted PDF text from ${name}:${truncNote}\n\n${result.text}`;
}
