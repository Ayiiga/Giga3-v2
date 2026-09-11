import type { NewsQueryClassification } from "./types";

const TODAY_RE =
  /\b(today|tonight|this morning|this afternoon|right now|just now|currently|as of now)\b/i;
const LATEST_RE = /\b(latest|most recent|newest|current|recent)\b/i;
const BREAKING_RE =
  /\b(breaking news|just broke|developing story|news flash|urgent:?|live updates?)\b/i;
const COMPARE_RE =
  /\b(compare reports?|compare sources?|what do sources say|how do outlets report|cross[- ]check|multiple sources)\b/i;
const VERIFY_RE =
  /\b(fact[- ]?check|verify (this )?(story|claim|news|report)|is this (news )?(true|real|fake|accurate)|true or false|debunk)\b/i;
const DEVELOPING_RE = /\b(developing story|developing event|still unfolding|ongoing story)\b/i;

const GHANA_RE =
  /\b(ghana(?:ian)?|accra|kumasi|tamale|tema|black stars|parliament of ghana)\b/i;
const AFRICA_RE = /\b(africa(?:n)?|sub[- ]?saharan|west africa)\b/i;

const TOPIC_PATTERNS: Array<{ topic: string; re: RegExp }> = [
  { topic: "politics", re: /\b(politics|election|parliament|government|minister|president)\b/i },
  { topic: "sports", re: /\b(sports?|football|black stars|match|score|league)\b/i },
  { topic: "business", re: /\b(business|economy|market|inflation|cedi|trade)\b/i },
  { topic: "education", re: /\b(education|school|bece|wassce|university|students?)\b/i },
  { topic: "technology", re: /\b(technology|tech|digital|startup|ai)\b/i },
  { topic: "health", re: /\b(health|hospital|disease|outbreak|medical)\b/i },
];

const NEWS_QUERY_RE =
  /\b(news|headlines|what happened|what are people reporting|what's happening|updates?)\b/i;

export function classifyNewsQuery(query: string): NewsQueryClassification {
  const q = query.trim();
  const requiresRetrieval =
    TODAY_RE.test(q) ||
    LATEST_RE.test(q) ||
    BREAKING_RE.test(q) ||
    NEWS_QUERY_RE.test(q) ||
    VERIFY_RE.test(q) ||
    COMPARE_RE.test(q);

  let requestedTime: NewsQueryClassification["requestedTime"] = "unspecified";
  if (BREAKING_RE.test(q)) requestedTime = "breaking";
  else if (TODAY_RE.test(q)) requestedTime = "today";
  else if (LATEST_RE.test(q)) requestedTime = "latest";

  let country: string | undefined;
  if (GHANA_RE.test(q)) country = "Ghana";
  else if (AFRICA_RE.test(q)) country = "Africa";

  let city: string | undefined;
  if (/\baccra\b/i.test(q)) city = "Accra";
  else if (/\bkumasi\b/i.test(q)) city = "Kumasi";

  let topic: string | undefined;
  for (const pattern of TOPIC_PATTERNS) {
    if (pattern.re.test(q)) {
      topic = pattern.topic;
      break;
    }
  }

  return {
    country,
    region: country === "Africa" ? "Africa" : country === "Ghana" ? "West Africa" : undefined,
    city,
    topic,
    requestedTime,
    requiresRetrieval,
    verificationRequested: VERIFY_RE.test(q),
    comparisonRequested: COMPARE_RE.test(q),
    developingStory: DEVELOPING_RE.test(q) || BREAKING_RE.test(q),
  };
}

export function requiresNewsRetrieval(query: string): boolean {
  return classifyNewsQuery(query).requiresRetrieval;
}
