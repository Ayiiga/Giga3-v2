import type { AiModeId } from "./aiModes";
import type {
  ChatCompletionAttachment,
  ChatCompletionMessage,
} from "./chatEngine";

type QueryClass =
  | "factual"
  | "academic"
  | "procedural"
  | "creative"
  | "opinion";

type SourceKind = "user_prompt" | "attachment" | "conversation";

type SourceCandidate = {
  kind: SourceKind;
  title: string;
  excerpt: string;
  baseScore: number;
};

export type RankedSource = {
  id: string;
  kind: SourceKind;
  title: string;
  excerpt: string;
  score: number;
};

export type AnswerQualityContext = {
  queryClass: QueryClass;
  requiresCitation: boolean;
  systemPromptAddon: string;
  retrievalContextBlock: string | null;
  rankedSources: RankedSource[];
};

export type AnswerQualityReport = {
  confidenceScore: number;
  confidenceLabel: "low" | "medium" | "high";
  queryClass: QueryClass;
  requiresCitation: boolean;
  citationCount: number;
  sourceCount: number;
  flags: string[];
};

export type ValidatedAnswer = {
  content: string;
  report: AnswerQualityReport;
};

export type QualityMonitoringSnapshot = {
  totalResponses: number;
  highConfidenceRate: number;
  lowConfidenceRate: number;
  citationCoverageRate: number;
  hallucinationRiskRate: number;
};

const MAX_EXCERPT_LENGTH = 420;
const MAX_RANKED_SOURCES = 6;
const MAX_HISTORY_CANDIDATES = 8;

const qualityStats = {
  totalResponses: 0,
  highConfidenceResponses: 0,
  lowConfidenceResponses: 0,
  responsesWithCitation: 0,
  responsesWithHallucinationRisk: 0,
};

const FACT_HEAVY_MODES = new Set<AiModeId>([
  "general",
  "coding",
  "homework",
  "waec",
  "university",
  "research",
  "news",
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function truncateText(input: string, max = MAX_EXCERPT_LENGTH): string {
  const compact = normalizeWhitespace(input);
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}...`;
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function lexicalOverlapScore(queryTokens: string[], text: string): number {
  if (queryTokens.length === 0) return 0;
  const tokenSet = new Set(tokenize(text));
  if (tokenSet.size === 0) return 0;
  let overlap = 0;
  for (const queryToken of queryTokens) {
    if (tokenSet.has(queryToken)) overlap += 1;
  }
  return overlap / queryTokens.length;
}

function hasAcademicIntent(query: string): boolean {
  return /\b(exam|homework|waec|solve|calculate|derive|proof|equation|diagram|show\s+work|step[- ]by[- ]step)\b/i.test(
    query
  );
}

function hasCreativeIntent(query: string): boolean {
  return /\b(poem|story|lyrics|creative|fiction|brainstorm|caption|post idea|slogan)\b/i.test(
    query
  );
}

function hasOpinionIntent(query: string): boolean {
  return /\b(opinion|think about|which is better|pros and cons|debate)\b/i.test(
    query
  );
}

function inferQueryClass(mode: AiModeId, query: string): QueryClass {
  if (hasAcademicIntent(query) || mode === "homework" || mode === "waec" || mode === "university") {
    return "academic";
  }
  if (hasCreativeIntent(query) || mode === "book" || mode === "social" || mode === "resume") {
    return "creative";
  }
  if (hasOpinionIntent(query)) {
    return "opinion";
  }
  if (/\b(how to|steps|process|procedure|workflow|implement)\b/i.test(query)) {
    return "procedural";
  }
  return "factual";
}

function shouldRequireCitation(mode: AiModeId, queryClass: QueryClass): boolean {
  if (queryClass === "creative") return false;
  if (queryClass === "opinion" && !FACT_HEAVY_MODES.has(mode)) return false;
  return FACT_HEAVY_MODES.has(mode) || queryClass === "factual" || queryClass === "academic";
}

function buildSourceCandidates(params: {
  query: string;
  attachments: ChatCompletionAttachment[];
  history: Array<{ role: string; content: string }>;
}): SourceCandidate[] {
  const candidates: SourceCandidate[] = [
    {
      kind: "user_prompt",
      title: "User request",
      excerpt: truncateText(params.query),
      baseScore: 0.3,
    },
  ];

  for (const attachment of params.attachments) {
    const attachmentText = attachment.text?.trim();
    if (!attachmentText && !attachment.dataUrl) continue;
    candidates.push({
      kind: "attachment",
      title: `Attachment: ${attachment.name}`,
      excerpt: truncateText(
        attachmentText && attachmentText.length > 0
          ? attachmentText
          : "Image attachment provided (visual content available)."
      ),
      baseScore: 0.55,
    });
  }

  const historyCandidates = params.history
    .filter((turn) => turn.role === "user" || turn.role === "assistant")
    .slice(-MAX_HISTORY_CANDIDATES)
    .map((turn, index) => ({
      kind: "conversation" as const,
      title: `Conversation context ${index + 1} (${turn.role})`,
      excerpt: truncateText(turn.content),
      baseScore: turn.role === "assistant" ? 0.18 : 0.22,
    }));

  candidates.push(...historyCandidates);
  return candidates;
}

function rankSources(
  query: string,
  candidates: SourceCandidate[],
  max = MAX_RANKED_SOURCES
): RankedSource[] {
  const queryTokens = tokenize(query);
  return candidates
    .map((candidate) => {
      const lexical = lexicalOverlapScore(queryTokens, candidate.excerpt);
      const score = clamp(candidate.baseScore + lexical * 0.8, 0, 1);
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ candidate, score }, index) => ({
      id: `S${index + 1}`,
      kind: candidate.kind,
      title: candidate.title,
      excerpt: candidate.excerpt,
      score: Number(score.toFixed(3)),
    }));
}

function buildRetrievalContextBlock(
  queryClass: QueryClass,
  rankedSources: RankedSource[]
): string | null {
  if (rankedSources.length === 0) return null;
  const header = `Ranked evidence context (${queryClass} query):`;
  const lines = rankedSources.map(
    (source) =>
      `[${source.id}] (${source.kind}, score=${source.score}) ${source.title}: ${source.excerpt}`
  );
  return `${header}\n${lines.join("\n")}`;
}

function buildSystemPromptAddon(params: {
  queryClass: QueryClass;
  requiresCitation: boolean;
  rankedSources: RankedSource[];
}): string {
  const citationRule = params.requiresCitation
    ? "- For factual or academic claims, cite supporting evidence inline with [S1], [S2], etc. Use only sources that exist in the ranked evidence context.\n- Do not invent citations, URLs, statistics, institutions, people, or events.\n- If evidence is insufficient or uncertain, explicitly state uncertainty and provide the safest interpretation."
    : "- Keep claims honest and transparent. If a detail is uncertain, state uncertainty instead of guessing.";

  const educationRule =
    "- Use educational structure: concise definitions, clear steps, practical examples, and real-world application when useful.\n- For exam-style questions, show method, formulas/calculations where applicable, then provide the final answer.";

  const transparencyRule =
    "- Separate facts from assumptions when ambiguity exists.\n- Prefer authoritative evidence from provided context. If no evidence is available, say so clearly.\n- Keep answers verifiable and transparent.";

  const sourceHint =
    params.rankedSources.length > 0
      ? `- You have ${params.rankedSources.length} ranked context source(s). Use them before relying on unstated memory.`
      : "- No ranked context source is available beyond the user query; keep confidence conservative and flag limitations.";

  return [
    "Accuracy, Authenticity, and Trustworthiness Engine:",
    "- Prioritize factual correctness and reliability over fluency.",
    citationRule,
    transparencyRule,
    educationRule,
    sourceHint,
  ].join("\n");
}

export function prepareAnswerQualityContext(params: {
  mode: AiModeId;
  query: string;
  attachments?: ChatCompletionAttachment[];
  history?: Array<{ role: string; content: string }>;
}): AnswerQualityContext {
  const query = params.query.trim();
  const attachments = params.attachments ?? [];
  const history = params.history ?? [];
  const queryClass = inferQueryClass(params.mode, query);
  const requiresCitation = shouldRequireCitation(params.mode, queryClass);

  const candidates = buildSourceCandidates({ query, attachments, history });
  const rankedSources = rankSources(query, candidates);

  return {
    queryClass,
    requiresCitation,
    systemPromptAddon: buildSystemPromptAddon({
      queryClass,
      requiresCitation,
      rankedSources,
    }),
    retrievalContextBlock: buildRetrievalContextBlock(queryClass, rankedSources),
    rankedSources,
  };
}

function extractCitationIds(answer: string): string[] {
  const ids = new Set<string>();
  const matches = answer.match(/\[S\d+\]/g) ?? [];
  for (const match of matches) {
    ids.add(match.slice(1, -1));
  }
  return [...ids];
}

function estimateClaimDensity(answer: string): number {
  const sentenceCount = Math.max(
    1,
    answer
      .split(/[.!?]\s+/)
      .map((part) => part.trim())
      .filter(Boolean).length
  );
  const numericClaims = (answer.match(/\b\d+(?:\.\d+)?(?:%|x|k|m|b)?\b/gi) ?? [])
    .length;
  const datedClaims = (answer.match(/\b(19|20)\d{2}\b/g) ?? []).length;
  return numericClaims + datedClaims + Math.ceil(sentenceCount * 0.35);
}

function hasUncertaintyDisclosure(answer: string): boolean {
  return /\b(uncertain|not fully sure|cannot verify|may be outdated|limited evidence|might be inaccurate|insufficient evidence)\b/i.test(
    answer
  );
}

function confidenceLabel(
  score: number
): "low" | "medium" | "high" {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

function buildVerificationBlock(
  report: AnswerQualityReport,
  sources: RankedSource[]
): string {
  const sourceSummary =
    sources.length === 0
      ? "No ranked context sources available."
      : sources
          .slice(0, 4)
          .map((source) => `[${source.id}] ${source.title}`)
          .join("; ");
  const flags =
    report.flags.length === 0 ? "none" : report.flags.join(", ");

  return [
    "### Verification",
    `- Confidence: ${report.confidenceLabel} (${report.confidenceScore.toFixed(2)})`,
    `- Citation count: ${report.citationCount}`,
    `- Evidence used: ${sourceSummary}`,
    `- Validation flags: ${flags}`,
  ].join("\n");
}

export function validateAnswerQuality(params: {
  answer: string;
  context: AnswerQualityContext;
}): ValidatedAnswer {
  const answer = params.answer.trim();
  const citationIds = extractCitationIds(answer);
  const claimDensity = estimateClaimDensity(answer);
  const uncertaintyDisclosure = hasUncertaintyDisclosure(answer);

  let confidence = 0.68;
  const flags: string[] = [];

  if (params.context.requiresCitation) {
    confidence -= 0.08;
    if (citationIds.length === 0) {
      confidence -= 0.24;
      flags.push("missing_citations");
    }
  }

  if (params.context.rankedSources.length === 0) {
    confidence -= 0.12;
    flags.push("limited_context_sources");
  }

  if (claimDensity > citationIds.length * 3 && params.context.requiresCitation) {
    confidence -= 0.15;
    flags.push("high_claim_density_low_evidence");
  }

  if (uncertaintyDisclosure) {
    confidence += 0.05;
  } else if (params.context.requiresCitation && citationIds.length === 0) {
    flags.push("missing_uncertainty_disclosure");
  }

  if (params.context.queryClass === "creative") {
    confidence += 0.08;
  }

  confidence = clamp(confidence, 0.05, 0.98);
  const label = confidenceLabel(confidence);

  const report: AnswerQualityReport = {
    confidenceScore: Number(confidence.toFixed(3)),
    confidenceLabel: label,
    queryClass: params.context.queryClass,
    requiresCitation: params.context.requiresCitation,
    citationCount: citationIds.length,
    sourceCount: params.context.rankedSources.length,
    flags,
  };

  const noteNeeded = label === "low" && !uncertaintyDisclosure;
  const transparencyPrefix = noteNeeded
    ? "Transparency note: I may be uncertain about parts of this answer because available evidence is limited. I will clearly flag assumptions and suggest verification steps.\n\n"
    : "";

  const hasVerificationSection = /(^|\n)### Verification\b/.test(answer);
  const shouldAppendVerification =
    !hasVerificationSection &&
    (params.context.requiresCitation || label !== "high");
  const verificationBlock = shouldAppendVerification
    ? `\n\n${buildVerificationBlock(report, params.context.rankedSources)}`
    : "";

  return {
    content: `${transparencyPrefix}${answer}${verificationBlock}`.trim(),
    report,
  };
}

export function recordQualityObservation(
  report: AnswerQualityReport
): QualityMonitoringSnapshot {
  qualityStats.totalResponses += 1;
  if (report.confidenceLabel === "high") qualityStats.highConfidenceResponses += 1;
  if (report.confidenceLabel === "low") qualityStats.lowConfidenceResponses += 1;
  if (report.citationCount > 0) qualityStats.responsesWithCitation += 1;
  if (
    report.flags.includes("missing_citations") ||
    report.flags.includes("high_claim_density_low_evidence")
  ) {
    qualityStats.responsesWithHallucinationRisk += 1;
  }

  const total = Math.max(1, qualityStats.totalResponses);
  return {
    totalResponses: qualityStats.totalResponses,
    highConfidenceRate: Number(
      (qualityStats.highConfidenceResponses / total).toFixed(3)
    ),
    lowConfidenceRate: Number(
      (qualityStats.lowConfidenceResponses / total).toFixed(3)
    ),
    citationCoverageRate: Number(
      (qualityStats.responsesWithCitation / total).toFixed(3)
    ),
    hallucinationRiskRate: Number(
      (qualityStats.responsesWithHallucinationRisk / total).toFixed(3)
    ),
  };
}

export function toRetrievalSystemMessage(
  context: AnswerQualityContext
): ChatCompletionMessage[] {
  if (!context.retrievalContextBlock) return [];
  return [{ role: "system", content: context.retrievalContextBlock }];
}
