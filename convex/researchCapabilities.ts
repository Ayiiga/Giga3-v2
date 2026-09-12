/**
 * Research capability routing — shared detection and query shaping for
 * Live Web, current news, fact-check, and deep research modes.
 */

export const RESEARCH_CAPABILITY_IDS = [
  "general",
  "live_web",
  "current_news",
  "ghana_news",
  "africa_news",
  "world_news",
  "technology",
  "business",
  "education",
  "sports",
  "entertainment",
  "science",
  "politics",
  "breaking_news",
  "fact_check",
  "verify_image",
  "deep_research",
] as const;

export type ResearchCapabilityId = (typeof RESEARCH_CAPABILITY_IDS)[number];

export type VerificationVerdict =
  | "confirmed"
  | "partially_true"
  | "misleading"
  | "false"
  | "insufficient_evidence"
  | "developing";

export type NewsStatusLabel = "verified" | "developing" | "unverified" | "disputed";

export type ResponseBasis =
  | "ai_knowledge"
  | "live_web"
  | "current_news"
  | "fact_checked"
  | "device_location";

const NEWS_CAPABILITIES = new Set<ResearchCapabilityId>([
  "current_news",
  "ghana_news",
  "africa_news",
  "world_news",
  "technology",
  "business",
  "education",
  "sports",
  "entertainment",
  "science",
  "politics",
  "breaking_news",
]);

const TIME_SENSITIVE_RE =
  /\b(today|tonight|yesterday|this week|this month|this year|latest|current|recent|breaking|just now|right now|as of now|news|headlines|now|202[4-9]|stock price|weather|score|election|who is (the )?president|announcement|regulation|law passed|match result|final score)\b/i;

const GHANA_NEWS_RE =
  /\b(ghana(?:ian)?\s+(?:news|headlines|updates|politics|today)|news (?:in|from|about) ghana|accra|kumasi|tamale|tema|black stars|parliament of ghana|mahama|akufo-addo|graphic online|myjoyonline|ghanaweb|citinewsroom|citi fm|joy news|daily graphic)\b/i;

const BREAKING_NEWS_RE =
  /\b(breaking news|just broke|developing story|news flash|urgent:?|live updates?)\b/i;

const FACT_CHECK_RE =
  /\b(fact[- ]?check|verify (this )?(claim|news|screenshot|image|photo|post|tweet)|is this (?:news )?(true|real|fake|genuine|accurate)|true or false|fake news|misinformation|disinformation|debunk|did this (happen|really)|authentic or (fake|misinformation))\b/i;

const VERIFY_IMAGE_RE =
  /\b(verify (this )?(image|screenshot|photo|picture|meme|post)|is this (screenshot|image|photo) (real|fake|genuine)|check (this )?(image|screenshot))\b/i;

const LOCATION_INTENT_RE =
  /\b(where am i|what('s| is) my location|my (current )?location|where do i live|locate me)\b/i;

import { GHANA_NEWS_SOURCE_HINTS } from "./newsEvidence/sourceRegistry";

export { GHANA_NEWS_SOURCE_HINTS };

export function isValidResearchCapability(
  value: string | undefined | null
): value is ResearchCapabilityId {
  return (
    typeof value === "string" &&
    (RESEARCH_CAPABILITY_IDS as readonly string[]).includes(value)
  );
}

export function isNewsCapability(id: ResearchCapabilityId): boolean {
  return NEWS_CAPABILITIES.has(id);
}

export function shouldAutoEnableLiveWeb(query: string): boolean {
  return TIME_SENSITIVE_RE.test(query.trim());
}

export function detectGhanaNewsIntent(query: string): boolean {
  return GHANA_NEWS_RE.test(query.trim());
}

export function detectBreakingNewsIntent(query: string): boolean {
  return BREAKING_NEWS_RE.test(query.trim());
}

/** Headline/news lookup — not fact-check verification (handled separately). */
export function detectNewsRetrievalIntent(query: string): boolean {
  const q = query.trim();
  if (detectGhanaNewsIntent(q) || detectBreakingNewsIntent(q)) return true;
  if (/\bghana\b/i.test(q) && /\b(latest|today|current|breaking|figures|inflation|economy|news|headlines)\b/i.test(q)) {
    return true;
  }
  return (
    /\b(latest|current|today'?s?|recent|breaking)\b[\s\S]{0,32}\bnews\b/i.test(q) ||
    /\bnews (today|update|updates|headlines|briefing)\b/i.test(q) ||
    /\b(headlines|what(?:'s| is) (?:in|on) the news)\b/i.test(q)
  );
}

export function detectFactCheckIntent(query: string): boolean {
  return FACT_CHECK_RE.test(query.trim());
}

export function detectVerifyImageIntent(
  query: string,
  hasImageAttachment: boolean
): boolean {
  if (hasImageAttachment && VERIFY_IMAGE_RE.test(query.trim())) return true;
  if (hasImageAttachment && FACT_CHECK_RE.test(query.trim())) return true;
  return false;
}

export function detectLocationIntent(query: string): boolean {
  return LOCATION_INTENT_RE.test(query.trim());
}

/** Greetings and small talk — skip live web even when a news persona is active. */
const CONVERSATIONAL_GREETING_RE =
  /^(hi|hello|hey|yo|hiya|good\s+(morning|afternoon|evening|night)|thanks?|thank\s+you|ok(?:ay)?|please|help|how\s+are\s+you|what(?:'s|\s+is)\s+up)[\s!.,?]*$/i;

export function isConversationalChatQuery(query: string): boolean {
  const q = query.trim();
  if (!q || q.length > 96) return false;
  if (CONVERSATIONAL_GREETING_RE.test(q)) return true;
  if (q.length <= 28 && !TIME_SENSITIVE_RE.test(q) && !/\?/.test(q)) {
    return /^[\p{L}\p{N}\s'.,!-]+$/u.test(q);
  }
  return false;
}

export function resolveResearchCapability(args: {
  explicit?: string | null;
  query: string;
  liveWebEnabled: boolean;
  hasImageAttachment?: boolean;
}): ResearchCapabilityId {
  if (isValidResearchCapability(args.explicit) && args.explicit !== "general") {
    if (isConversationalChatQuery(args.query)) {
      return "general";
    }
    if (
      isNewsCapability(args.explicit) &&
      !detectNewsRetrievalIntent(args.query) &&
      !detectGhanaNewsIntent(args.query) &&
      !detectBreakingNewsIntent(args.query)
    ) {
      return "general";
    }
    return args.explicit;
  }

  if (detectVerifyImageIntent(args.query, Boolean(args.hasImageAttachment))) {
    return "verify_image";
  }

  if (detectFactCheckIntent(args.query)) {
    return "fact_check";
  }

  const q = args.query.trim();
  if (detectGhanaNewsIntent(q)) {
    return detectBreakingNewsIntent(q) ? "breaking_news" : "ghana_news";
  }

  if (detectBreakingNewsIntent(q) && TIME_SENSITIVE_RE.test(q)) {
    return "breaking_news";
  }

  if (args.liveWebEnabled || shouldAutoEnableLiveWeb(q)) {
    return "live_web";
  }

  return "general";
}

export function shouldRunLiveWebResearch(capability: ResearchCapabilityId): boolean {
  return (
    capability === "live_web" ||
    capability === "deep_research" ||
    isNewsCapability(capability) ||
    capability === "fact_check" ||
    capability === "verify_image"
  );
}

export function buildGhanaNewsSearchQuery(query: string): string {
  const siteBias = GHANA_NEWS_SOURCE_HINTS.map((d) => `site:${d}`).join(" OR ");
  return `${query.trim()} Ghana news today (${siteBias})`.trim();
}

export function buildResearchSearchQuery(
  query: string,
  capability: ResearchCapabilityId
): string {
  const trimmed = query.trim();
  if (capability === "ghana_news") {
    return buildGhanaNewsSearchQuery(trimmed);
  }

  if (!isNewsCapability(capability)) return trimmed;

  const categoryHints: Record<ResearchCapabilityId, string> = {
    general: "",
    live_web: "",
    current_news: "latest news today",
    ghana_news: "",
    africa_news: "Africa news today",
    world_news: "world news today",
    technology: "technology news today",
    business: "business news today",
    education: "education news today",
    sports: "sports news scores today",
    entertainment: "entertainment news today",
    science: "science news today",
    politics: "political news today",
    breaking_news: detectGhanaNewsIntent(trimmed)
      ? buildGhanaNewsSearchQuery(trimmed)
      : "breaking news today",
    fact_check: "",
    verify_image: "",
    deep_research: "",
  };

  const hint = categoryHints[capability];
  if (!hint) return trimmed;
  return `${trimmed} ${hint}`.trim();
}

export const NEWS_RESPONSE_FORMAT_GUIDANCE = [
  "News assistant response format (mandatory when answering current-events questions):",
  "- Be concise and user-friendly — lead with the headline answer, then 2–4 bullet points max.",
  "- Use evidence states from the NEWS EVIDENCE PACKAGE only: Official, Verified/Corroborated, Reported, Developing, Unverified, Conflicting, Insufficient evidence.",
  "- Never upgrade a story to Verified unless the evidence package status supports it.",
  "- For each key story: include publication date (or 'date unknown'), outlet name, and a markdown link to the source.",
  "- **Breaking** may only be used when the evidence package assigns breakingLabel=BREAKING.",
  "- Never invent current news, quotes, dates, or URLs. If you cannot verify a claim, say so.",
  "- If live search is unavailable and evidence count is zero, say evidence is insufficient — do not invent headlines.",
].join("\n");

export function researchSystemPromptAddon(capability: ResearchCapabilityId): string {
  switch (capability) {
    case "ghana_news":
      return [
        "Mode: Ghana news assistant.",
        "Focus on current Ghana headlines from multiple credible outlets (e.g. Graphic Online, MyJoyOnline, GhanaWeb, Citi Newsroom, B&FT, Pulse Ghana).",
        "Cross-check important claims across at least two independent sources when possible.",
        "Prefer primary/official sources for government, election, and security stories.",
        NEWS_RESPONSE_FORMAT_GUIDANCE,
        "Never present training-data headlines as today's news.",
      ].join("\n");
    case "fact_check":
    case "verify_image":
      return [
        "Mode: Fact verification.",
        "Extract the specific claim, search reputable and primary sources, compare evidence, and give a clear verdict.",
        "Possible verdict labels: CONFIRMED, PARTIALLY TRUE, MISLEADING, FALSE, INSUFFICIENT EVIDENCE, DEVELOPING.",
        "Do not label FALSE merely because a claim cannot be found.",
        "Do not label TRUE merely because one website says so.",
        "Explain the evidence behind your verdict and cite sources with dates.",
        NEWS_RESPONSE_FORMAT_GUIDANCE,
      ].join("\n");
    case "breaking_news":
      return [
        "Mode: Breaking news.",
        "Prefer very recent primary and official sources. For Ghana stories, cross-check Graphic Online, MyJoyOnline, GhanaWeb, and Citi Newsroom.",
        "Label each item: **Verified**, **Developing**, **Unverified**, or **Disputed**.",
        "Do not present old information as breaking news. Never invent developing stories.",
        NEWS_RESPONSE_FORMAT_GUIDANCE,
      ].join("\n");
    default:
      if (isNewsCapability(capability)) {
        return [
          "Mode: Current news research.",
          "Search current sources, prefer primary/official sources where appropriate, cross-check important claims.",
          NEWS_RESPONSE_FORMAT_GUIDANCE,
        ].join("\n");
      }
      if (capability === "deep_research") {
        return [
          "Mode: Deep research.",
          "Compare multiple authoritative sources, note conflicts, and cite publication dates.",
          NEWS_RESPONSE_FORMAT_GUIDANCE,
        ].join("\n");
      }
      if (capability === "live_web") {
        return [
          "Mode: Live web research.",
          "Prefer authoritative primary sources, compare multiple sources, cite links with dates, and note retrieval time.",
          "Never pretend model knowledge is live information.",
          NEWS_RESPONSE_FORMAT_GUIDANCE,
        ].join("\n");
      }
      return "";
  }
}

export function responseBasisForCapability(
  capability: ResearchCapabilityId,
  usedLiveWeb: boolean
): ResponseBasis {
  if (capability === "fact_check" || capability === "verify_image") {
    return usedLiveWeb ? "fact_checked" : "ai_knowledge";
  }
  if (capability === "ghana_news" || isNewsCapability(capability)) {
    return usedLiveWeb ? "current_news" : "ai_knowledge";
  }
  if (capability === "live_web" || capability === "deep_research") {
    return usedLiveWeb ? "live_web" : "ai_knowledge";
  }
  return usedLiveWeb ? "live_web" : "ai_knowledge";
}

export const RESEARCH_CAPABILITY_LABELS: Record<ResearchCapabilityId, string> = {
  general: "General Research",
  live_web: "Live Web",
  current_news: "Current News",
  ghana_news: "Ghana News",
  africa_news: "Africa News",
  world_news: "World News",
  technology: "Technology",
  business: "Business",
  education: "Education",
  sports: "Sports",
  entertainment: "Entertainment",
  science: "Science",
  politics: "Politics",
  breaking_news: "Breaking News",
  fact_check: "Fact Check",
  verify_image: "Verify Image",
  deep_research: "Deep Research",
};

export function liveSearchUnavailableNewsFallback(capability: ResearchCapabilityId): string {
  if (capability === "ghana_news" || capability === "breaking_news") {
    return "Live web search is temporarily unavailable. I cannot verify the very latest Ghana headlines right now. Below is the most recent reliable information I have — items without fresh confirmation are labeled **Unverified**.";
  }
  if (isNewsCapability(capability)) {
    return "Live web search is temporarily unavailable. I cannot verify the latest headlines right now. Below is the most recent reliable information available — unconfirmed items are labeled **Unverified**.";
  }
  return "Live web is temporarily unavailable. I can provide general AI knowledge, but cannot verify the latest information right now.";
}
