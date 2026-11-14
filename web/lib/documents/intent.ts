import type { DocumentTemplateKind } from "@/lib/documents/types";

const DOC_REQUEST_RE =
  /\b(create|write|draft|prepare|generate|make|build|revise|format|export|compose|polish|humanize|humanise|rewrite|rephrase)\b[\s\S]{0,60}\b(cv|resume|curriculum vitae|application letter|cover letter|business plan|proposal|report|lesson notes?|meeting minutes|invoice|memo|thesis|dissertation|research (?:paper|report)|book|manuscript|presentation|slides?|document|tribute|memorial|obituar(?:y|ies)|eulog(?:y|ies)|speech|letter|word(?: document)?|pdf|docx)\b/i;

const FOLLOW_UP_RE =
  /\b(make it (?:one|two) pages?|add (?:a )?passport (?:photo|picture)|remove (?:the )?photo|centre|center the title|use violet|export as (?:word|pdf|docx)|download as (?:word|pdf|docx)|as a (?:pdf|word|docx)|tighten|add (?:a )?page break|change (?:to )?a5|change (?:to )?a4|make it (shorter|longer|more professional|more concise)|shorten (it|this)|revise (it|this))\b/i;

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
  if (/\b(thesis|dissertation)\b/.test(t)) return "thesis";
  if (/\b(research paper|research report|academic research)\b/.test(t)) return "research-paper";
  if (/\b(book|manuscript)\b/.test(t)) return "book";
  if (/\b(presentation|slides?|slide deck|powerpoint)\b/.test(t)) return "presentation";
  if (/\breport\b/.test(t)) return "report";
  if (/\bmemo\b/.test(t)) return "memo";
  return "generic";
}

/** Composer / server hint when a document template or export is requested. */
export const DOCUMENT_STUDIO_SYSTEM_HINT =
  "Produce a complete document with clear headings and human, natural, polished language suited to its audience. For CVs prioritize relevant evidence, an ATS-friendly structure, and one A4 page when concise or two pages when experience warrants; never invent qualifications, achievements, dates, metrics or referees. A passport photo is optional and only supplied by the user. Books, research and theses must use appropriate full length, with real references only (never fabricated citations). Prefer editable PDF/Word-ready content. Avoid conversational filler and never claim an export was created unless the user downloaded it.";
