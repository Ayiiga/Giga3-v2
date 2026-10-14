/**
 * Client-side Academy certificate PDF (pdf-lib) + QR (qrcode).
 * Compatible with Next static export / Cloudflare Pages — no Convex filesystem.
 * PDF is a rendering of an authoritative certificate record; never invents grades.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import {
  CERTIFICATE_ISSUER,
  CERTIFICATE_TEMPLATE_VERSION,
  buildVerificationUrl,
} from "@/lib/gigalearn/academy/certificatePolicy";

export type CertificatePdfInput = {
  publicId: string;
  learnerDisplayName: string;
  courseTitle: string;
  issuingOrganization?: string;
  issuedAt: number;
  completedAt: number;
  finalGrade?: number | null;
  status: "valid" | "revoked";
  templateVersion?: string;
  verificationUrl?: string;
  siteOrigin?: string;
};

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(ts);
  }
}

/** WinAnsi-safe subset for StandardFonts. */
function safePdfText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "?")
    .slice(0, 200);
}

export async function buildCertificateQrDataUrl(verificationUrl: string): Promise<string> {
  return QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
    color: { dark: "#4c1d95", light: "#ffffff" },
  });
}

export async function generateAcademyCertificatePdf(
  input: CertificatePdfInput
): Promise<Uint8Array> {
  const origin = input.siteOrigin ?? "https://www.giga3ai.com";
  const verifyUrl =
    input.verificationUrl ?? buildVerificationUrl(input.publicId, origin);
  const issuer = input.issuingOrganization ?? CERTIFICATE_ISSUER;
  const template = input.templateVersion ?? CERTIFICATE_TEMPLATE_VERSION;

  const pdf = await PDFDocument.create();
  // Landscape A4 for certificates (readable on mobile + print).
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const page = pdf.addPage([pageWidth, pageHeight]);

  const violet = rgb(0.3, 0.11, 0.58); // ~#4c1d95
  const violetSoft = rgb(0.91, 0.88, 0.98);
  const ink = rgb(0.12, 0.12, 0.16);
  const muted = rgb(0.35, 0.35, 0.42);
  const white = rgb(1, 1, 1);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);

  // Outer frame
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: white,
  });
  page.drawRectangle({
    x: 18,
    y: 18,
    width: pageWidth - 36,
    height: pageHeight - 36,
    borderColor: violet,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 28,
    y: 28,
    width: pageWidth - 56,
    height: pageHeight - 56,
    borderColor: violetSoft,
    borderWidth: 1.5,
  });

  // Header band
  page.drawRectangle({
    x: 40,
    y: pageHeight - 110,
    width: pageWidth - 80,
    height: 70,
    color: violetSoft,
  });

  page.drawText(safePdfText("Giga3 AI"), {
    x: 56,
    y: pageHeight - 70,
    size: 22,
    font: bold,
    color: violet,
  });
  page.drawText(safePdfText("GigaLearn Academy Certificate of Completion"), {
    x: 56,
    y: pageHeight - 92,
    size: 12,
    font: regular,
    color: muted,
  });

  if (input.status === "revoked") {
    page.drawText("REVOKED", {
      x: pageWidth - 160,
      y: pageHeight - 78,
      size: 18,
      font: bold,
      color: rgb(0.7, 0.1, 0.1),
    });
  }

  page.drawText(safePdfText("This certifies that"), {
    x: 56,
    y: pageHeight - 160,
    size: 12,
    font: regular,
    color: muted,
  });

  const learner = safePdfText(input.learnerDisplayName);
  page.drawText(learner, {
    x: 56,
    y: pageHeight - 200,
    size: 28,
    font: serif,
    color: ink,
  });

  page.drawText(safePdfText("has completed the course"), {
    x: 56,
    y: pageHeight - 235,
    size: 12,
    font: regular,
    color: muted,
  });

  page.drawText(safePdfText(input.courseTitle), {
    x: 56,
    y: pageHeight - 270,
    size: 18,
    font: bold,
    color: violet,
  });

  const metaY = pageHeight - 320;
  const lines = [
    `Issued by: ${safePdfText(issuer)}`,
    `Completion date: ${formatDate(input.completedAt)}`,
    `Issue date: ${formatDate(input.issuedAt)}`,
    input.finalGrade != null ? `Final grade: ${Math.round(input.finalGrade)}%` : null,
    `Certificate ID: ${safePdfText(input.publicId)}`,
    `Template: ${safePdfText(template)}`,
    "Not an externally accredited exam certificate unless separately stated by Giga3 AI.",
  ].filter(Boolean) as string[];

  let y = metaY;
  for (const line of lines) {
    page.drawText(line, {
      x: 56,
      y,
      size: 10,
      font: regular,
      color: ink,
    });
    y -= 16;
  }

  page.drawText(safePdfText("Verify authenticity:"), {
    x: 56,
    y: 96,
    size: 9,
    font: bold,
    color: muted,
  });
  page.drawText(safePdfText(verifyUrl), {
    x: 56,
    y: 80,
    size: 8,
    font: regular,
    color: violet,
  });

  // QR (violet brand)
  try {
    const dataUrl = await buildCertificateQrDataUrl(verifyUrl);
    const base64 = dataUrl.split(",")[1] ?? "";
    const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const qrImage = await pdf.embedPng(pngBytes);
    const qrSize = 110;
    page.drawImage(qrImage, {
      x: pageWidth - 56 - qrSize,
      y: 56,
      width: qrSize,
      height: qrSize,
    });
    page.drawText("Scan to verify", {
      x: pageWidth - 56 - qrSize,
      y: 42,
      size: 8,
      font: regular,
      color: muted,
    });
  } catch {
    // QR optional if runtime lacks atob/canvas — URL text remains.
  }

  return pdf.save();
}

export function certificatePdfFilename(publicId: string): string {
  return `giga3-academy-certificate-${publicId.replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`;
}
