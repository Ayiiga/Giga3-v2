import type { DocumentTemplateKind } from "@/lib/documents/types";

const DOC_REQUEST_RE =
  /\b(create|write|draft|prepare|generate|make|build|revise|format|export|compose|polish|humanize|humanise|rewrite|rephrase)\b[\s\S]{0,60}\b(cv|resume|curriculum vitae|application letter|cover letter|business plan|proposal|report|lesson notes?|meeting minutes|invoice|memo|document|tribute|memorial|obituar(?:y|ies)|eulog(?:y|ies)|speech|letter|word(?: document)?|pdf|docx)\b/i;

const FOLLOW_UP_RE =
  /\b(make it one page|centre|center the title|use violet|export as (?:word|pdf|docx)|download as (?:word|pdf|docx)|as a (?:pdf|word|docx)|tighten|add (?:a )?page break|change (?:to )?a5|change (?:to )?a4|make it (shorter|longer|more professional|more concise)|shorten (it|this)|revise (it|this))\b/i;

export function isDocumentCreationRequest(text: string): boolean {
  return DOC_REQUEST_RE.test(text.trim());
}

export function isDocumentFollowUpRequest(text: string): boolean {
  return FOLLOW_UP_RE.test(text.trim());
}

export function isDocumentExportRequest(text: string): boolean {
  return /\b(export(?:\s+\w+){0,3}\s+as\s+(?:word|pdf|docx)|download(?:\s+\w+){0,3}\s+as\s+(?:word|pdf|docx)|as a (?:pdf|word|docx)(?: document)?|prepare .{0,80}(?:pdf|word|docx))\b/i.test(
    text.trim()
  );
}

export function inferKindFromRequest(text: string): DocumentTemplateKind {
  const t = text.toLowerCase();
  if (/\b(cv|resume|curriculum vitae)\b/.test(t)) return "cv";
  if (/\b(application letter|cover letter)\b/.test(t)) return "application-letter";
  if (/\bbusiness plan\b/.test(t)) return "business-plan";
  if (/\blesson notes?\b/.test(t)) return "lesson-notes";
  if (/\bmeeting minutes\b/.test(t)) return "meeting-minutes";
  if (/\binvoice\b/.test(t)) return "invoice";
  if (/\bproposal\b/.test(t)) return "proposal";
  if (/\breport\b/.test(t)) return "report";
  if (/\bmemo\b/.test(t)) return "memo";
  return "generic";
}

/** Composer / server hint when a document template or export is requested. */
export const DOCUMENT_STUDIO_SYSTEM_HINT =
  "Format the reply as a complete document with clear markdown headings and lists. Prefer content ready for PDF/Word export. Avoid conversational filler. Never claim a PDF or Word file was created unless the user actually exported or downloaded it.";
