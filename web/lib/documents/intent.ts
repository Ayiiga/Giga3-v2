import type { DocumentTemplateKind } from "@/lib/documents/types";

const DOC_REQUEST_RE =
  /\b(create|write|draft|prepare|generate|make|build|revise|format|export)\b[\s\S]{0,40}\b(cv|resume|curriculum vitae|application letter|cover letter|business plan|proposal|report|lesson notes?|meeting minutes|invoice|memo|document)\b/i;

const FOLLOW_UP_RE =
  /\b(make it one page|centre|center the title|use violet|export as (?:word|pdf|docx)|tighten|add (?:a )?page break|change (?:to )?a5|change (?:to )?a4)\b/i;

export function isDocumentCreationRequest(text: string): boolean {
  return DOC_REQUEST_RE.test(text.trim());
}

export function isDocumentFollowUpRequest(text: string): boolean {
  return FOLLOW_UP_RE.test(text.trim());
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

/** Composer hint appended when a document template is selected. */
export const DOCUMENT_STUDIO_SYSTEM_HINT =
  "Format the reply as a complete document with clear markdown headings and lists. Prefer content ready for PDF/Word export. Avoid conversational filler.";
