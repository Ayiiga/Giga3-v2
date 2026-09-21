/**
 * Distinguishes answering from user-supplied text vs retrieving/verifying current news.
 */

import { detectFactCheckIntent } from "../researchCapabilities";
import { classifyNewsQuery } from "./queryClassification";

export type InformationRequestMode =
  | "answer_from_user_context"
  | "verify_user_content"
  | "retrieve_current_news"
  | "general";

const USER_SUPPLIED_FRAMING_RE =
  /\b(here(?:'s| is)|i(?:'ve| have) (?:received|been sent|got|shared|found|seen)|this (?:message|announcement|email|text|notice|post|article|link|screenshot|forward)|please (?:read|summarize|summarise|explain|help me understand|break down)|what does this (?:say|mean)|according to (?:this|the (?:message|announcement|text|email|notice))|the following (?:announcement|message|notice|email|text))\b/i;

const USER_CONTEXT_QUESTION_RE =
  /\b(what (?:date|deadline|amount|prize|category|categories)|when (?:do|does)|how much|who (?:wins|won|can)|where (?:can|do)|summarize|summarise|explain|break down|list the|tell me about)\b/i;

const VERIFY_CURRENT_RE =
  /\b(is this (?:[\w'-]+\s+){0,4}(?:still )?(?:current|genuine|real|legitimate|accurate|true|official|valid)|(?:still|currently) (?:valid|current|open|active)|has this (?:been|already)|fact[- ]?check|verify (?:this|whether)|can you confirm|is it true that|check if this)\b/i;

const MONTH_OR_YEAR_RE =
  /\b(?:\d{1,2}\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+20\d{2}\b|\b20\d{2}\b/i;

const CURRENCY_OR_PRIZE_RE =
  /\b(GHS|USD|EUR|GBP|₵|\$\d|€\d|£\d|\d{1,3}(?:,\d{3})+\b)/i;

const STRUCTURED_FACT_RE =
  /\b(nomination|nominations|winner|winners|category|categories|deadline|closes? on|closing date|open for|season \d+|service centre|service center|website)\b/i;

const CATEGORY_LIST_RE =
  /\b(?:Education|Health|Economic Empowerment|Sustainability|Digital Innovation)\b/i;

/** Minimum length for a pasted announcement / notice with extractable facts. */
const SUBSTANTIVE_PASTE_MIN_CHARS = 100;

export function countUserProvidedFactMarkers(query: string): number {
  const q = query.trim();
  let markers = 0;
  if (MONTH_OR_YEAR_RE.test(q)) markers += 1;
  if (CURRENCY_OR_PRIZE_RE.test(q)) markers += 1;
  if (STRUCTURED_FACT_RE.test(q)) markers += 1;
  if (CATEGORY_LIST_RE.test(q)) markers += 1;
  if (/\b(?:include|includes|categories include|areas include)\b/i.test(q)) markers += 1;
  return markers;
}

export function hasSubstantiveUserProvidedContent(query: string): boolean {
  const q = query.trim();
  if (q.length < SUBSTANTIVE_PASTE_MIN_CHARS) return false;
  return countUserProvidedFactMarkers(q) >= 2;
}

export function detectVerifyUserContentIntent(query: string): boolean {
  const q = query.trim();
  if (detectFactCheckIntent(q)) return true;
  if (VERIFY_CURRENT_RE.test(q)) return true;
  return classifyNewsQuery(q).verificationRequested;
}

export function detectAnswerFromUserContextIntent(query: string): boolean {
  const q = query.trim();
  if (detectVerifyUserContentIntent(q)) return false;

  if (USER_SUPPLIED_FRAMING_RE.test(q)) return true;

  if (hasSubstantiveUserProvidedContent(q)) {
    // A substantive paste with an extractive question is still user-context.
    if (USER_CONTEXT_QUESTION_RE.test(q)) return true;
    // Marketing copy often contains words like "today" — that is not a news lookup.
    if (
      /\b(what(?:'s| is) (?:the )?(?:latest|current)|(?:latest|current|breaking) (?:news|headlines)|news (?:today|headlines|update|briefing)|headlines (?:today|now))\b/i.test(
        q
      )
    ) {
      return false;
    }
    return true;
  }

  return false;
}

export function classifyInformationRequest(query: string): InformationRequestMode {
  const q = query.trim();
  if (!q) return "general";

  if (detectVerifyUserContentIntent(q)) {
    return "verify_user_content";
  }

  if (detectAnswerFromUserContextIntent(q)) {
    return "answer_from_user_context";
  }

  const newsClass = classifyNewsQuery(q);
  if (newsClass.requiresRetrieval) {
    return "retrieve_current_news";
  }

  return "general";
}

export const USER_PROVIDED_CONTENT_GUIDANCE = [
  "User-provided content mode:",
  "- The user's message contains factual information they supplied directly (announcement, notice, pasted text, or attachment excerpt).",
  "- Answer using the information in the user's message when it is sufficient for the request.",
  "- Clearly label facts as user-provided (e.g. 'The message you shared says…', 'According to the announcement you pasted…').",
  "- Do NOT represent user-provided details as independently web-verified or official unless external evidence confirms them.",
  "- Do NOT refuse to answer simply because live web search failed or returned no sources.",
  "- Do NOT invent dates, amounts, categories, URLs, or official statements beyond what the user supplied.",
].join("\n");

export const USER_CONTEXT_WITH_FAILED_RETRIEVAL_GUIDANCE = [
  "External retrieval note:",
  "- Live web / news search did not return usable external evidence for this turn.",
  "- If the user's message already contains enough detail, answer from that supplied content.",
  "- State explicitly that external verification was unavailable and the answer is based on user-provided information.",
  "- Only use the generic 'could not retrieve enough current evidence' refusal when the user asked for current news AND supplied no usable content to answer from.",
].join("\n");

export function userContextDisclosurePrefix(): string {
  return "Based on the information you provided";
}

export function isGenericRetrievalFailureAnswer(answer: string): boolean {
  return /\bI couldn't retrieve enough current evidence\b/i.test(answer.trim());
}

function extractSentencesWithMarkers(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.filter((sentence) => countUserProvidedFactMarkers(sentence) > 0);
}

/**
 * Deterministic fallback when external retrieval failed but the user pasted enough
 * factual content to answer safely without inventing details.
 */
export function buildUserContextRecoveryAnswer(query: string): string {
  const q = query.trim();
  const factualSentences = extractSentencesWithMarkers(q);
  const body =
    factualSentences.length > 0
      ? factualSentences.map((s) => `- ${s.replace(/\.$/, "")}.`).join("\n")
      : `- ${q.slice(0, 500)}${q.length > 500 ? "…" : ""}`;

  return `${userContextDisclosurePrefix()}, here is what the supplied message states:

${body}

External verification was unavailable for this turn, so these details should be treated as user-provided information unless independently confirmed from an official source.`;
}
