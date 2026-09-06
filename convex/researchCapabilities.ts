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

const FACT_CHECK_RE =
  /\b(fact[- ]?check|verify (this )?(claim|news|screenshot|image|photo|post|tweet)|is this (?:news )?(true|real|fake|genuine|accurate)|true or false|fake news|misinformation|disinformation|debunk|did this (happen|really)|authentic or (fake|misinformation))\b/i;

const VERIFY_IMAGE_RE =
  /\b(verify (this )?(image|screenshot|photo|picture|meme|post)|is this (screenshot|image|photo) (real|fake|genuine)|check (this )?(image|screenshot))\b/i;

const LOCATION_INTENT_RE =
  /\b(where am i|what('s| is) my location|my (current )?location|where do i live|locate me)\b/i;

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

export function resolveResearchCapability(args: {
  explicit?: string | null;
  query: string;
  liveWebEnabled: boolean;
  hasImageAttachment?: boolean;
}): ResearchCapabilityId {
  if (isValidResearchCapability(args.explicit) && args.explicit !== "general") {
    return args.explicit;
  }

  if (detectVerifyImageIntent(args.query, Boolean(args.hasImageAttachment))) {
    return "verify_image";
  }

  if (detectFactCheckIntent(args.query)) {
    return "fact_check";
  }

  if (args.liveWebEnabled || shouldAutoEnableLiveWeb(args.query)) {
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

export function buildResearchSearchQuery(
  query: string,
  capability: ResearchCapabilityId
): string {
  const trimmed = query.trim();
  if (!isNewsCapability(capability)) return trimmed;

  const categoryHints: Record<ResearchCapabilityId, string> = {
    general: "",
    live_web: "",
    current_news: "latest news today",
    ghana_news: "Ghana news today site:ghanaweb.com OR site:myjoyonline.com OR site:graphic.com.gh",
    africa_news: "Africa news today",
    world_news: "world news today",
    technology: "technology news today",
    business: "business news today",
    education: "education news today",
    sports: "sports news scores today",
    entertainment: "entertainment news today",
    science: "science news today",
    politics: "political news today",
    breaking_news: "breaking news today",
    fact_check: "",
    verify_image: "",
    deep_research: "",
  };

  const hint = categoryHints[capability];
  if (!hint) return trimmed;
  return `${trimmed} ${hint}`.trim();
}

export function researchSystemPromptAddon(capability: ResearchCapabilityId): string {
  switch (capability) {
    case "fact_check":
    case "verify_image":
      return [
        "Mode: Fact verification.",
        "Extract the specific claim, search reputable and primary sources, compare evidence, and give a clear verdict.",
        "Possible verdict labels: CONFIRMED, PARTIALLY TRUE, MISLEADING, FALSE, INSUFFICIENT EVIDENCE, DEVELOPING.",
        "Do not label FALSE merely because a claim cannot be found.",
        "Do not label TRUE merely because one website says so.",
        "Explain the evidence behind your verdict and cite sources.",
      ].join("\n");
    case "breaking_news":
      return [
        "Mode: Breaking news.",
        "Prefer very recent primary and official sources.",
        "Label items as confirmed, developing, disputed, or unverified.",
        "Do not present old information as breaking news.",
      ].join("\n");
    default:
      if (isNewsCapability(capability)) {
        return [
          "Mode: Current news research.",
          "Search current sources, prefer primary/official sources where appropriate, cross-check important claims.",
          "Show publication timestamps when available.",
          "Label stories as confirmed, developing, disputed, or unverified when appropriate.",
        ].join("\n");
      }
      if (capability === "deep_research") {
        return [
          "Mode: Deep research.",
          "Compare multiple authoritative sources, note conflicts, and cite publication dates.",
        ].join("\n");
      }
      if (capability === "live_web") {
        return [
          "Mode: Live web research.",
          "Prefer authoritative primary sources, compare multiple sources, cite links, and note retrieval time.",
          "Never pretend model knowledge is live information.",
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
  if (isNewsCapability(capability)) {
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
