/**
 * MTN Heroes of Change Season 8 — text-only response rules for nomination-related chat.
 * Applies when the user asks about MTN Heroes of Change with nomination context,
 * or links Giga3 AI / Ayiiga Benard Issaka to that programme.
 */

/** Official MTN Heroes of Change Season 8 facts (programme-level, not nominee-specific). */
export const MTN_OFFICIAL_FACTS = {
  season: 8,
  themeShort: "Small Actions Create Big Impact",
  themeFull: "Together for a Sustainable Future: Small Actions, Big Impact",
  prizes: {
    overallWinner: "GH¢400,000",
    categoryOrFirstRunnerUp: "GH¢200,000",
    perRemainingFinalist: "GH¢100,000 per remaining finalist",
  },
  /** Reported in MTN Season 8 launch press coverage — not a live open/closed guarantee. */
  nominationsWindowReported: "August–September 2026",
  nominationPortal: "https://heroes.mtn.com.gh",
  officialProgramPage: "https://mtn.com.gh/heroes-of-change/",
  officialContacts: {
    tel: "+233244300000",
    tollFree: "100",
    email: "customercare.gh@mtn.com",
  },
  categories: [
    "Education",
    "Health",
    "Economic Empowerment",
    "Sustainability",
    "Digital Innovation",
  ],
} as const;

/**
 * User/project nomination context — NOT MTN-confirmed winner, finalist, or endorsement.
 * Used when preparing nomination materials only.
 */
export const GIGA3_NOMINATION_CONTEXT = {
  nominee: "Ayiiga Benard Issaka (Young Anointed)",
  project:
    "Giga3 AI — a Ghanaian digital platform that integrates AI-powered tools for learning, research, creativity, and productivity",
  proposedCategory: "Digital Innovation",
  attribution:
    "User/project nomination context only — not an MTN-confirmed winner, finalist, endorsement, or official recognition unless the user supplies verified proof.",
} as const;

/**
 * Close date from a user-provided MTN SMS/campaign message stored in this repository's
 * regression fixtures — not verified here as MTN's sole official primary source.
 */
export const MTN_USER_PROVIDED_SMS_CLOSE_DATE = "19 October 2026";

const MTN_HEROES_PATTERN =
  /\b(?:mtn\s+)?heroes\s+of\s+change\b|heroes\.mtn\.com\.gh|\bseason\s+8\b.*\b(?:mtn|hero|nominate|nomination)\b|\b(?:mtn|hero|nominate|nomination)\b.*\bseason\s+8\b/i;

/** MTN programme markers — standalone "nomination" without MTN/Heroes does not qualify. */
const MTN_PROGRAMME_CONTEXT_PATTERN =
  /\b(?:mtn(?:\s+ghana)?|heroes\s+of\s+change|heroes\.mtn|season\s+8|digital\s+innovation(?:\s+(?:category|award|nomination))?)\b/i;

const AYIIGA_PATTERN = /\bayiiga\s+benard\s+issaka\b|\byoung\s+anointed\b/i;

const GIGA3_PATTERN = /\bgiga\s*3\s*ai\b/i;

const NOMINATION_LETTER_PATTERN =
  /\b(?:nomination|nominate|nominee|nominator|supporting\s+letter|recommendation\s+letter|letter\s+of\s+support|endorsement\s+letter)\b/i;

const EXPLICIT_VISUAL_REQUEST_PATTERN =
  /\b(?:image|picture|photo|graphic|poster|visual(?:\s+aid)?|design|png|jpe?g|svg|pdf|infographic|flyer|brochure|social\s+media\s+graphic|share\s+button|diagram|flowchart|mind\s*map|mermaid|chart|a3|a4)\b/i;

const AUTO_HERO_VISUAL_PATTERN =
  /ayiiga\s+benard\s+issaka.*(?:young\s+anointed)?.*giga\s*3\s*ai.*digital\s+innovation|giga\s*3\s*ai.*digital\s+innovation.*(?:young\s+anointed|ayiiga)/i;

const MTN_VERIFICATION_RISK_FLAGS = new Set([
  "missing_citations",
  "unsupported_claims",
  "fabricated_citations",
  "high_stakes_unverified",
  "ocr_not_verified",
  "attachment_analysis_unavailable",
]);

/** @deprecated Use MTN_OFFICIAL_FACTS — kept for tests importing legacy name during transition */
export const MTN_HEROES_FACTS = MTN_OFFICIAL_FACTS;

function hasMtnProgrammeContext(query: string): boolean {
  return MTN_HEROES_PATTERN.test(query) || MTN_PROGRAMME_CONTEXT_PATTERN.test(query);
}

/** True when Season 8 MTN Heroes nomination rules apply for this message. */
export function detectMtnHeroesOfChangeIntent(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  if (MTN_HEROES_PATTERN.test(trimmed)) return true;
  if (AYIIGA_PATTERN.test(trimmed) && hasMtnProgrammeContext(trimmed)) return true;
  if (GIGA3_PATTERN.test(trimmed) && hasMtnProgrammeContext(trimmed)) return true;
  return false;
}

export function detectMtnNominationLetterIntent(query: string): boolean {
  return (
    detectMtnHeroesOfChangeIntent(query) && NOMINATION_LETTER_PATTERN.test(query)
  );
}

export function detectMtnDeadlineQuestion(query: string): boolean {
  return (
    detectMtnHeroesOfChangeIntent(query) &&
    /\b(deadline|close|closing|open|still open|last day|when does|how long|current date|today)\b/i.test(
      query
    )
  );
}

/** User explicitly asked for a visual asset — allowed only then. */
export function detectMtnExplicitVisualRequest(query: string): boolean {
  return EXPLICIT_VISUAL_REQUEST_PATTERN.test(query);
}

export function buildMtnDeadlineGuidance(): string {
  return [
    "Nomination deadline guidance:",
    `- Launch reporting cites nominations ${MTN_OFFICIAL_FACTS.nominationsWindowReported}.`,
    `- A user-provided MTN SMS/campaign message in this project cites close on ${MTN_USER_PROVIDED_SMS_CLOSE_DATE} — treat that as user-supplied content, not independently verified MTN primary source.`,
    '- Do NOT declare nominations open or closed without verified current official confirmation.',
    '- If dates conflict or current status is unclear, say exactly: "The available Season 8 information contains differing dates. Please verify the current deadline through MTN\'s official Heroes of Change channels."',
    "- Do not state that nominations closed in September if a verified later deadline may apply, and do not state an October close unless the user supplied that message or you verified it officially.",
  ].join("\n");
}

export function buildMtnHeroesSystemPromptAddon(query: string): string {
  const official = MTN_OFFICIAL_FACTS;
  const nomination = GIGA3_NOMINATION_CONTEXT;
  const nominationLetter = detectMtnNominationLetterIntent(query);
  const explicitVisual = detectMtnExplicitVisualRequest(query);
  const deadlineQuestion = detectMtnDeadlineQuestion(query);

  const lines = [
    "MTN Heroes of Change Season 8 — response rules (mandatory):",
    "- Answer with TEXT ONLY. Do not include visual aids, diagrams, Mermaid blocks, giga-visual/giga-chart JSON, automatic social-media graphics, Share buttons, or a ### Verification section.",
    "- Distinguish official MTN programme facts from user/project nomination context. Never present nominee/project details as MTN-confirmed winner, finalist, endorsement, or official recognition.",
    "",
    "Official MTN programme facts (Season 8):",
    `- Season ${official.season}; theme "${official.themeShort}" (Sustainability Month framing: "${official.themeFull}").`,
    `- Prizes: overall winner ${official.prizes.overallWinner}; category/first runner-up ${official.prizes.categoryOrFirstRunnerUp}; ${official.prizes.perRemainingFinalist}.`,
    `- Categories include: ${official.categories.join(", ")}.`,
    `- Nominations reported ${official.nominationsWindowReported} (launch reporting — not a live open/closed guarantee).`,
    `- Nomination portal: ${official.nominationPortal}; official programme page: ${official.officialProgramPage}.`,
    `- Verified official MTN contact channels: Tel ${official.officialContacts.tel}; Toll Free ${official.officialContacts.tollFree}; Email ${official.officialContacts.email}.`,
    "",
    "User/project nomination context (NOT MTN-confirmed status):",
    `- Nominee: ${nomination.nominee}; Project: ${nomination.project}; Proposed category: ${nomination.proposedCategory}.`,
    `- ${nomination.attribution}`,
    "",
    "- Do not fabricate statistics, endorsements, judges, winners, finalist status, user counts, revenue, partnerships, or MTN statements.",
    "- If uncertain about any MTN detail, begin with: Verification needed — then direct the user to verify on the official programme page or official MTN contact channels above.",
    buildMtnDeadlineGuidance(),
  ];

  if (deadlineQuestion) {
    lines.push(
      "- This question asks about deadlines or current status: use cautious wording; cite the conflicting dates rule above; do not guess open/closed for today's date."
    );
  }

  if (explicitVisual) {
    lines.push(
      "- The user explicitly requested a visual; you may describe one in plain text only (no image files, no fenced visual blocks)."
    );
  } else {
    lines.push(
      '- Do NOT produce "Ayiiga Benard Issaka (Young Anointed) Giga3 AI Digital Innovation" visual/marketing content unless the user explicitly asks for an image or graphic.'
    );
  }

  if (nominationLetter) {
    lines.push(
      "- Nomination letter request: provide a complete two-page nomination/support letter in plain text only (no visuals). Structure: formal letterhead block (date, from, to MTN Heroes of Change Season 8), opening paragraph, nominee introduction, project impact (Giga3 AI — proposed Digital Innovation category), community/education outcomes, evidence of sustained contribution (only what the user supplied — do not invent achievements), closing endorsement, signature block. Aim for roughly 600–900 words across two pages when printed."
    );
  }

  return lines.filter(Boolean).join("\n");
}

const FENCED_BLOCK_PATTERN =
  /```(?:mermaid|giga-visual|giga-chart|chart)\b[\s\S]*?```/gi;

export function stripMtnDisallowedVisualContent(answer: string): string {
  let cleaned = answer.replace(FENCED_BLOCK_PATTERN, "");
  cleaned = cleaned.replace(/\n+###\s*Visual Aids[\s\S]*?(?=\n###\s|\n##\s|$)/gi, "");
  cleaned = cleaned.replace(/\n+###\s*Verification[\s\S]*$/i, "");
  cleaned = cleaned.replace(/^Transparency note:[\s\S]*?\n\n/i, "");
  cleaned = cleaned.replace(/\b(?:Share button|share this visual)\b[^\n]*/gi, "");
  if (AUTO_HERO_VISUAL_PATTERN.test(cleaned)) {
    cleaned = cleaned.replace(AUTO_HERO_VISUAL_PATTERN, GIGA3_NOMINATION_CONTEXT.nominee);
  }
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

export function normalizeMtnConfidenceScore(score: unknown): number | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return score;
}

export function shouldApplyMtnVerificationPrefix(params: {
  confidenceScore: unknown;
  flags?: string[];
  answerHasUncertainty?: boolean;
}): boolean {
  const score = normalizeMtnConfidenceScore(params.confidenceScore);
  const flags = params.flags ?? [];

  if (flags.some((flag) => MTN_VERIFICATION_RISK_FLAGS.has(flag))) {
    return true;
  }

  if (params.answerHasUncertainty && score !== null && score < 0.8) {
    return true;
  }

  if (score !== null && score < 0.45) {
    return true;
  }

  return false;
}

export type MtnLowConfidenceParams = {
  confidenceScore: unknown;
  flags?: string[];
  answerHasUncertainty?: boolean;
};

export function applyMtnLowConfidencePrefix(
  answer: string,
  params: MtnLowConfidenceParams | number
): string {
  const resolved: MtnLowConfidenceParams =
    typeof params === "number" ? { confidenceScore: params } : params;

  if (!shouldApplyMtnVerificationPrefix(resolved)) {
    return answer;
  }
  if (/^verification needed\b/i.test(answer.trim())) {
    return answer;
  }

  const official = MTN_OFFICIAL_FACTS;
  return `Verification needed — confirm current nomination details at ${official.officialProgramPage} (Tel ${official.officialContacts.tel}, Toll Free ${official.officialContacts.tollFree}, ${official.officialContacts.email}).\n\n${answer}`.trim();
}
