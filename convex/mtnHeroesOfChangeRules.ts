/**
 * MTN Heroes of Change Season 8 — text-only response rules for nomination-related chat.
 * Applies when the user asks about MTN Heroes of Change, Giga3 AI, or Ayiiga Benard Issaka.
 */

export const MTN_HEROES_FACTS = {
  hero: "Ayiiga Benard Issaka (Young Anointed)",
  project:
    "Giga3 AI — a Ghanaian digital platform that integrates AI-powered tools for learning, research, creativity, and productivity",
  category: "Digital Innovation",
  season: 8,
  theme: "Small Actions Create Big Impact",
  prizes: {
    overall: "GH¢400,000",
    categoryWinner: "GH¢200,000",
    other: "GH¢100,000",
  },
  nominationsWindow: "August–September 2026",
  website: "https://heroes.mtn.com.gh",
  whatsapp: "0549767070",
} as const;

const MTN_HEROES_PATTERN =
  /\b(?:mtn\s+)?heroes\s+of\s+change\b|heroes\.mtn\.com\.gh|\bseason\s+8\b.*\b(?:mtn|hero|nominate|nomination)\b|\b(?:mtn|hero|nominate|nomination)\b.*\bseason\s+8\b/i;

const AYIIGA_PATTERN =
  /\bayiiga\s+benard\s+issaka\b|\byoung\s+anointed\b/i;

const GIGA3_PATTERN = /\bgiga\s*3\s*ai\b/i;

const NOMINATION_LETTER_PATTERN =
  /\b(?:nomination|nominate|nominee|nominator|supporting\s+letter|recommendation\s+letter|letter\s+of\s+support|endorsement\s+letter)\b/i;

const EXPLICIT_VISUAL_REQUEST_PATTERN =
  /\b(?:image|picture|photo|graphic|poster|visual(?:\s+aid)?|design|png|jpe?g|svg|pdf|infographic|flyer|brochure|social\s+media\s+graphic|share\s+button|diagram|flowchart|mind\s*map|mermaid|chart|a3|a4)\b/i;

const AUTO_HERO_VISUAL_PATTERN =
  /ayiiga\s+benard\s+issaka.*(?:young\s+anointed)?.*giga\s*3\s*ai.*digital\s+innovation|giga\s*3\s*ai.*digital\s+innovation.*(?:young\s+anointed|ayiiga)/i;

/** True when Season 8 MTN Heroes / Giga3 AI / Ayiiga nomination rules apply. */
export function detectMtnHeroesOfChangeIntent(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  if (MTN_HEROES_PATTERN.test(trimmed)) return true;
  if (AYIIGA_PATTERN.test(trimmed)) return true;
  if (GIGA3_PATTERN.test(trimmed)) return true;
  return false;
}

export function detectMtnNominationLetterIntent(query: string): boolean {
  return (
    detectMtnHeroesOfChangeIntent(query) && NOMINATION_LETTER_PATTERN.test(query)
  );
}

/** User explicitly asked for a visual asset — allowed only then. */
export function detectMtnExplicitVisualRequest(query: string): boolean {
  return EXPLICIT_VISUAL_REQUEST_PATTERN.test(query);
}

export function buildMtnHeroesSystemPromptAddon(query: string): string {
  const facts = MTN_HEROES_FACTS;
  const nominationLetter = detectMtnNominationLetterIntent(query);
  const explicitVisual = detectMtnExplicitVisualRequest(query);

  const lines = [
    "MTN Heroes of Change Season 8 — response rules (mandatory):",
    "- Answer with TEXT ONLY. Do not include visual aids, diagrams, Mermaid blocks, giga-visual/giga-chart JSON, social media graphics, A4/PNG/JPG/SVG/PDF references, Share buttons, or a ### Verification section.",
    `- Use only these factual nomination details unless the user supplies newer verified information: Hero ${facts.hero}; Project ${facts.project}; Category ${facts.category}; Season ${facts.season}, theme "${facts.theme}"; Prizes overall ${facts.prizes.overall}, category winner ${facts.prizes.categoryWinner}, additional tier ${facts.prizes.other}; Nominations ${facts.nominationsWindow}; Nominate at ${facts.website}; WhatsApp ${facts.whatsapp}.`,
    "- Do not fabricate statistics, endorsements, judges, winners, or MTN statements.",
    "- If your confidence in any detail is below 0.8, begin with exactly: Verification needed — then explain what should be confirmed on heroes.mtn.com.gh or via WhatsApp 0549767070.",
    explicitVisual
      ? "- The user explicitly requested a visual; you may describe one in plain text only (no image files, no fenced visual blocks)."
      : '- Do NOT produce "Ayiiga Benard Issaka (Young Anointed) Giga3 AI Digital Innovation" visual/marketing content unless the user explicitly asks for an image or graphic.',
  ];

  if (nominationLetter) {
    lines.push(
      "- Nomination letter request: provide a complete two-page nomination/support letter in plain text only (no visuals). Structure: formal letterhead block (date, from, to MTN Heroes of Change Season 8), opening paragraph, nominee introduction, project impact (Giga3 AI — Digital Innovation), community/education outcomes, evidence of sustained contribution, closing endorsement, signature block. Aim for roughly 600–900 words across two pages when printed."
    );
  }

  return lines.join("\n");
}

const FENCED_BLOCK_PATTERN =
  /```(?:mermaid|giga-visual|giga-chart|chart)\b[\s\S]*?```/gi;

export function stripMtnDisallowedVisualContent(answer: string): string {
  let cleaned = answer.replace(FENCED_BLOCK_PATTERN, "");
  cleaned = cleaned.replace(/\n+###\s*Visual Aids[\s\S]*?(?=\n###\s|\n##\s|$)/gi, "");
  cleaned = cleaned.replace(/\n+###\s*Verification[\s\S]*$/i, "");
  cleaned = cleaned.replace(/^Transparency note:[\s\S]*?\n\n/i, "");
  cleaned = cleaned.replace(/\b(?:Share button|share this visual)\b[^\n]*/gi, "");
  cleaned = cleaned.replace(
    /\b(?:A3|A4|PNG|JPG|JPEG|SVG|PDF)\b(?:\s+(?:size|format|export|download))?[^\n]*/gi,
    ""
  );
  if (AUTO_HERO_VISUAL_PATTERN.test(cleaned)) {
    cleaned = cleaned.replace(AUTO_HERO_VISUAL_PATTERN, MTN_HEROES_FACTS.hero);
  }
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

export function applyMtnLowConfidencePrefix(
  answer: string,
  confidenceScore: number
): string {
  if (confidenceScore >= 0.8) return answer;
  if (/^verification needed\b/i.test(answer.trim())) return answer;
  return `Verification needed — confirm current nomination details at ${MTN_HEROES_FACTS.website} or WhatsApp ${MTN_HEROES_FACTS.whatsapp}.\n\n${answer}`.trim();
}
