/**
 * Permanent writing-quality standard for Giga3 chat.
 * Used by answerQuality / conversational + full reply workers.
 */

/** Strip UI slash-command prefixes (e.g. `/Humanize …`) so they do not steal intent. */
export function stripLeadingSlashCommands(query: string): string {
  return query
    .replace(/(^|\s)\/[A-Za-z][\w-]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rewrite / polish / humanize craft (edit existing text). */
export function hasRewritePolishIntent(query: string): boolean {
  const q = stripLeadingSlashCommands(query);
  return /\b(rewrite|re[- ]?write|rephrase|reword|humanize|humanise|polish|proofread|proof[- ]read|copy[- ]?edit|edit (this|the|my)|improve (this|the|my)|professionalize|professionalise|make (it |this )?(more )?(professional|polished|concise|shorter|warmer|formal|natural)|tighten (this|the|my)|clean up (this|the|my)|fix (the )?(grammar|tone|wording))\b/i.test(
    q
  );
}

/** Tributes, memorials, speeches, letters, and similar finished prose. */
export function hasMemorialOrSpeechIntent(query: string): boolean {
  return /\b(tribute|memorial|obituar(?:y|ies)|eulog(?:y|ies)|condolence|funeral (?:programme|program|speech)|farewell (?:message|speech)|toast (?:speech|to)|wedding speech|best[- ]man speech|maid of honour speech|announcement|personal (?:message|letter|note)|love letter|thank[- ]you (?:note|letter|message)|resignation letter|recommendation letter|reference letter|nomination letter|supporting letter|cover letter|application letter|speech|sermon)\b/i.test(
    query
  );
}

/** Captions, posts, short creative copy. */
export function hasShortFormCreativeIntent(query: string): boolean {
  return /\b(poem|poetry|story|novel|fiction|fictional|creative writing|brainstorm|caption|slogan|joke|screenplay|narrative|linkedin (?:post|about)|instagram (?:caption|post)|facebook post|tweet|x post)\b/i.test(
    query
  );
}

/** Document deliverables (CV, report, proposal, export PDF/Word). */
export function hasDocumentDeliverableIntent(query: string): boolean {
  return (
    /\b(create|write|draft|prepare|generate|make|build|compose|format|export)\b[\s\S]{0,60}\b(cv|resume|curriculum vitae|application letter|cover letter|business plan|proposal|report|lesson notes?|meeting minutes|invoice|memo|document|word(?: document)?|pdf|docx)\b/i.test(
      query
    ) ||
    /\b(export as (?:word|pdf|docx)|download as (?:word|pdf|docx)|as a (?:pdf|word|docx)(?: document)?)\b/i.test(
      query
    )
  );
}

/** Follow-ups that refine an existing draft in-thread. */
export function hasWritingFollowUpIntent(query: string): boolean {
  return /\b(make it (shorter|longer|more professional|more concise|warmer|firmer|softer|more formal|less formal)|shorten (it|this)|expand (it|this)|tone (it )?down|tone (it )?up|keep the (facts|details|names)|same (facts|details)|without changing (the )?meaning|revise (it|this)|another version|try again with)\b/i.test(
    query
  );
}

/**
 * Broad writing-craft intent: finished prose / polish / document deliverable.
 * Excludes pure research-backed citation requests.
 */
export function hasWritingCraftIntent(query: string): boolean {
  const q = stripLeadingSlashCommands(query.trim());
  if (!q) return false;
  if (/\b(research[- ]backed|with citations?|cite sources?|peer[- ]reviewed|literature review)\b/i.test(q)) {
    return false;
  }
  return (
    hasRewritePolishIntent(q) ||
    hasMemorialOrSpeechIntent(q) ||
    hasShortFormCreativeIntent(q) ||
    hasDocumentDeliverableIntent(q) ||
    hasWritingFollowUpIntent(q)
  );
}

/** Appended when writing craft is active — overrides Smart Answers / research panels. */
export const WRITING_CRAFT_SYSTEM_ADDON = [
  "Giga3 Writing Quality Standard (required for this request):",
  "- Deliver the requested writing immediately as finished content the user can use or send.",
  "- Use natural, polished, professional, human-sounding language. Adapt tone, length, structure, and vocabulary to the audience, platform, occasion, and the user's instructions.",
  "- Preserve every supplied name, fact, relationship, memory, cultural expression, and emotional meaning. Improve grammar, transitions, paragraph rhythm, readability, and vocabulary without changing intent.",
  "- Avoid repetitive openings, generic inspirational clichés, unnecessary headings, empty sections, excessive emojis, robotic transitions, and repetitive conclusions.",
  "- Do not invent personal experiences, facts, quotations, credentials, sources, or promises.",
  "- Do not use Giga3 Smart Answers headings (Quick Answer, Practice / Try It, Next Step, etc.), verification panels, confidence scores, citation lists, or research source cards for this writing task.",
  "- Do not explain your writing process unless the user asks how you wrote it.",
  "- Do not expose internal provider names, stack traces, integration details, or backend errors.",
  "- Ask clarifying questions only when essential information is genuinely missing; otherwise make reasonable assumptions and proceed.",
  "- For rewrites/humanize/polish: return only the improved text (or clearly labeled short options if the user asked for alternatives), ready to send.",
  "- For tributes, obituaries, eulogies, and condolences: write with dignity and warmth — a carefully crafted personal piece, not a generic AI essay.",
  "- For documents (CV, letter, report, proposal, business plan, etc.): use clear markdown headings and lists ready for PDF/Word export. Do not claim a file was generated unless an export actually ran.",
  "- For follow-ups like “make it shorter/more professional”: revise the previous draft; do not restart from scratch or drop important facts.",
].join("\n");

export const DOCUMENT_EXPORT_SYSTEM_HINT =
  "Format the reply as a complete document with clear markdown headings and lists, ready for PDF/Word export in Document Studio. Prefer export-ready content over conversational filler. Never claim a PDF or Word file was created unless the user actually downloaded or exported it.";
