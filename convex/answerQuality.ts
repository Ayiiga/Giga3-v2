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

export type ResponseMode = "conversational" | "educational" | "high_stakes";

type LearnerLevel = "basic" | "secondary" | "university" | "professional";
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
  query: string;
  queryClass: QueryClass;
  responseMode: ResponseMode;
  learnerLevel: LearnerLevel;
  isExamQuestion: boolean;
  isBiographyRequest: boolean;
  confidenceRequested: boolean;
  requiresCitation: boolean;
  showConfidenceByDefault: boolean;
  showVerificationByDefault: boolean;
  hasAnyAttachment: boolean;
  hasImageAttachment: boolean;
  hasDocumentAttachment: boolean;
  hasInlineImageData: boolean;
  systemPromptAddon: string;
  retrievalContextBlock: string | null;
  rankedSources: RankedSource[];
};

export type AnswerQualityReport = {
  confidenceScore: number;
  confidenceLabel: "low" | "medium" | "high";
  responseMode: ResponseMode;
  confidenceVisible: boolean;
  verificationVisible: boolean;
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
  verificationRate: number;
};

const MAX_EXCERPT_LENGTH = 420;
const MAX_RANKED_SOURCES = 6;
const MAX_HISTORY_CANDIDATES = 8;

const HIGH_STAKES_MODES = new Set<AiModeId>(["news", "research"]);
const CONVERSATIONAL_MODES = new Set<AiModeId>(["social", "book", "resume"]);

const qualityStats = {
  totalResponses: 0,
  highConfidenceResponses: 0,
  lowConfidenceResponses: 0,
  responsesWithCitation: 0,
  responsesWithHallucinationRisk: 0,
  responsesWithVerification: 0,
};

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
  return /\b(exam|homework|waec|bece|sat|igcse|a-?level|solve|calculate|derive|proof|equation|diagram|show\s+work|step[- ]by[- ]step|teach|explain)\b/i.test(
    query
  );
}

function hasCreativeIntent(query: string): boolean {
  return /\b(poem|story|lyrics|creative writing|fiction|brainstorm|caption|slogan|joke)\b/i.test(
    query
  );
}

function hasOpinionIntent(query: string): boolean {
  return /\b(opinion|think about|which is better|pros and cons|debate)\b/i.test(
    query
  );
}

function hasConversationalIntent(query: string): boolean {
  const compact = query.trim().toLowerCase();
  return (
    /^(hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening|how are you|what's up|whats up)[!.?]*$/.test(
      compact
    ) ||
    /\b(casual chat|small talk)\b/i.test(compact)
  );
}

function hasHighStakesIntent(query: string): boolean {
  return /\b(medical|medicine|diagnosis|symptom|treatment|drug|dosage|legal|law|contract|lawsuit|financial|finance|investment|stock|inflation|interest rate|tax|government|policy|election|breaking news|latest news|latest figures|research)\b/i.test(
    query
  );
}

function hasImageTextExtractionIntent(query: string): boolean {
  return (
    /\b(ocr|read|extract|transcribe|write\s*down|copy|detect)\b[\s\S]{0,48}\b(text|words?|letters?|writing)\b/i.test(
      query
    ) ||
    /\b(text|words?|writing)\b[\s\S]{0,48}\b(in|from|on)\b[\s\S]{0,32}\b(image|photo|picture|screenshot|scan|attachment)\b/i.test(
      query
    )
  );
}

function hasBiographyIntent(query: string): boolean {
  return /\b(biograph(?:y|ical)|life story|profile|write .* biography|about this person|personal history)\b/i.test(
    query
  );
}

function hasAttachmentInabilityLanguage(answer: string): boolean {
  return /\b(cannot|can't|unable|do not|don't)\b[\s\S]{0,28}\b(access|analy[sz]e|view|see|process|read|open)\b[\s\S]{0,52}\b(images?|photos?|pictures?|visual|files?|documents?|pdf|attachments?)\b/i.test(
    answer
  ) || /\b(text[- ]based model|can't view images)\b/i.test(answer);
}

function hasRetypeInstruction(answer: string): boolean {
  return /\b(retype|type (it|them|that) again|paste (the )?(text|content)|send (the )?text manually)\b/i.test(
    answer
  );
}

type AutoVisualKind =
  | "infographic"
  | "brochure"
  | "poster"
  | "flyer"
  | "diagram"
  | "flowchart"
  | "mind_map"
  | "timeline"
  | "process_chart"
  | "organizational_chart"
  | "educational_visual"
  | "business_presentation"
  | "study_notes_visualization"
  | "marketing_asset"
  | "social_media_graphic"
  | "comparison_table"
  | "scientific_illustration"
  | "circuit_diagram"
  | "geometry_drawing"
  | "mathematical_graph";

function hasVisualRequestIntent(query: string): boolean {
  return /\b(infographic|brochure|poster|flyer|diagram|flowchart|mind map|mindmap|timeline|process chart|organizational chart|org chart|presentation|study notes|marketing|social media graphic|comparison table|scientific illustration|circuit diagram|geometry|graph|plot|chart|visuali[sz]ation|advertisement|ad design)\b/i.test(
    query
  );
}

function shouldAutoSuggestEducationalVisual(query: string): boolean {
  return /\b(explain|how does|how do|process|cycle|steps|photosynthesis|water cycle|ecosystem|cellular respiration|force diagram|electrical circuit|geometry|algebra|calculus|biology|chemistry|physics)\b/i.test(
    query
  );
}

function hasExistingVisualBlock(answer: string): boolean {
  return /```(?:mermaid|giga-visual|giga-chart|chart)\b/i.test(answer);
}

function inferAutoVisualKind(query: string): AutoVisualKind {
  if (/\bbrochure\b/i.test(query)) return "brochure";
  if (/\bflyer\b/i.test(query)) return "flyer";
  if (/\bposter\b/i.test(query)) return "poster";
  if (/\binfographic\b/i.test(query)) return "infographic";
  if (/\bmind ?map\b/i.test(query)) return "mind_map";
  if (/\btimeline\b/i.test(query)) return "timeline";
  if (/\borg(?:anizational)? chart\b/i.test(query)) return "organizational_chart";
  if (/\bflow ?chart\b/i.test(query)) return "flowchart";
  if (/\bprocess\b/i.test(query)) return "process_chart";
  if (/\bpresentation\b/i.test(query)) return "business_presentation";
  if (/\bstudy notes?\b/i.test(query)) return "study_notes_visualization";
  if (/\bmarketing|advertisement|ad\b/i.test(query)) return "marketing_asset";
  if (/\bsocial\b/i.test(query)) return "social_media_graphic";
  if (/\bcomparison|compare|versus|vs\b/i.test(query)) return "comparison_table";
  if (/\bcircuit\b/i.test(query)) return "circuit_diagram";
  if (/\bgeometry|triangle|circle|angle\b/i.test(query)) return "geometry_drawing";
  if (/\bgraph|plot|function|equation|slope\b/i.test(query))
    return "mathematical_graph";
  if (/\bscientific|biology|chemistry|physics\b/i.test(query))
    return "scientific_illustration";
  if (/\bdiagram\b/i.test(query)) return "diagram";
  return "educational_visual";
}

function inferVisualSize(query: string): string {
  if (/\ba3\b/i.test(query)) return "A3";
  if (/\ba4\b/i.test(query)) return "A4";
  if (/\bfacebook\b/i.test(query)) return "Facebook";
  if (/\binstagram\b/i.test(query)) return "Instagram";
  if (/\btiktok\b/i.test(query)) return "TikTok";
  if (/\byoutube\b/i.test(query)) return "YouTube Thumbnail";
  if (/\blinkedin\b/i.test(query)) return "LinkedIn";
  return "A4";
}

function normalizeVisualLabel(input: string): string {
  const compact = normalizeWhitespace(input).replace(/[^\w\s:(),.%/-]/g, "");
  return compact.length > 72 ? `${compact.slice(0, 69)}...` : compact;
}

function extractVisualHighlights(answer: string, max = 5): string[] {
  const bulletLines = answer
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => normalizeVisualLabel(line.replace(/^[-*]\s+/, "")));
  if (bulletLines.length > 0) return bulletLines.slice(0, max);

  const sentences = answer
    .split(/[.!?]\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeVisualLabel(line));
  return sentences.slice(0, max);
}

function inferredVisualTitle(query: string): string {
  const trimmed = normalizeWhitespace(query).replace(/[?!.]+$/, "");
  if (!trimmed) return "Visual Summary";
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

function buildMermaidForQuery(query: string, highlights: string[]): string {
  if (/\bphotosynthesis\b/i.test(query)) {
    return [
      "flowchart LR",
      '  A["Sunlight"] --> B["Chlorophyll captures energy"]',
      '  B --> C["Water + CO₂ intake"]',
      '  C --> D["Glucose produced"]',
      '  D --> E["Oxygen released"]',
    ].join("\n");
  }
  if (/\bwater cycle\b/i.test(query)) {
    return [
      "flowchart LR",
      '  A["Evaporation"] --> B["Condensation"]',
      '  B --> C["Precipitation"]',
      '  C --> D["Collection"]',
      '  D --> A',
    ].join("\n");
  }
  if (/\bmind ?map\b/i.test(query)) {
    const center = inferredVisualTitle(query);
    const branches = highlights.slice(0, 4);
    return [
      "mindmap",
      `  root((${normalizeVisualLabel(center)}))`,
      ...branches.map((branch) => `    ${normalizeVisualLabel(branch)}`),
    ].join("\n");
  }
  if (/\btimeline\b/i.test(query)) {
    const points = highlights.slice(0, 4);
    return [
      "timeline",
      "  title Key Timeline",
      ...points.map((point, index) => `  ${index + 1} : ${normalizeVisualLabel(point)}`),
    ].join("\n");
  }
  if (/\borg(?:anizational)? chart\b/i.test(query)) {
    return [
      "flowchart TD",
      '  A["Leadership"] --> B["Operations"]',
      '  A --> C["Product"]',
      '  A --> D["Finance"]',
      '  B --> E["Execution Team"]',
      '  C --> F["Design & Engineering"]',
    ].join("\n");
  }
  if (/\bcircuit\b/i.test(query)) {
    return [
      "flowchart LR",
      '  A["Battery"] --> B["Switch"]',
      '  B --> C["Resistor"]',
      '  C --> D["Load / Lamp"]',
      '  D --> A',
    ].join("\n");
  }

  const nodes = highlights.slice(0, 4);
  const lines = ["flowchart LR"];
  for (let i = 0; i < nodes.length; i += 1) {
    lines.push(`  N${i + 1}["${normalizeVisualLabel(nodes[i])}"]`);
    if (i > 0) lines.push(`  N${i} --> N${i + 1}`);
  }
  if (nodes.length === 0) {
    lines.push('  N1["Key Concept"] --> N2["Main Steps"] --> N3["Outcome"]');
  }
  return lines.join("\n");
}

function buildVisualSpecBlock(
  query: string,
  answer: string,
  highlights: string[]
): string {
  const kind = inferAutoVisualKind(query);
  const spec = {
    version: "1.0",
    kind,
    title: inferredVisualTitle(query),
    size: inferVisualSize(query),
    summary: truncateText(answer, 240),
    exportFormats: ["PNG", "JPG", "SVG", "PDF"],
    sections: [
      {
        heading: "Key points",
        items: highlights.slice(0, 6),
      },
    ],
  };
  return ["```giga-visual", JSON.stringify(spec, null, 2), "```"].join("\n");
}

function buildChartSpecBlock(query: string, highlights: string[]): string | null {
  if (!/\b(chart|graph|plot|trend|comparison|statistics|data|math|equation)\b/i.test(query)) {
    return null;
  }
  const labels = highlights.slice(0, 5).map((item, index) => {
    const words = item.split(" ").slice(0, 3).join(" ");
    return words || `Metric ${index + 1}`;
  });
  if (labels.length === 0) return null;
  const chart = {
    title: `${inferredVisualTitle(query)} - visualized`,
    type: "bar",
    labels,
    datasets: [
      {
        label: "Relative weight",
        data: labels.map((_, index) => Math.max(1, labels.length - index)),
      },
    ],
  };
  return ["```giga-chart", JSON.stringify(chart, null, 2), "```"].join("\n");
}

function shouldAttachAutoVisuals(
  context: AnswerQualityContext,
  answer: string,
  flags: string[]
): boolean {
  if (context.responseMode === "conversational") return false;
  if (hasExistingVisualBlock(answer)) return false;
  if (
    flags.includes("ocr_not_verified") ||
    flags.includes("high_stakes_unverified") ||
    flags.includes("attachment_analysis_unavailable")
  ) {
    return false;
  }
  return (
    hasVisualRequestIntent(context.query) ||
    shouldAutoSuggestEducationalVisual(context.query) ||
    context.isExamQuestion
  );
}

function buildAutoVisualAugmentation(
  context: AnswerQualityContext,
  answer: string
): string | null {
  const highlights = extractVisualHighlights(answer);
  const mermaid = buildMermaidForQuery(context.query, highlights);
  const visualSpec = buildVisualSpecBlock(context.query, answer, highlights);
  const chartSpec = buildChartSpecBlock(context.query, highlights);
  return [
    "### Visual Aids",
    "```mermaid",
    mermaid,
    "```",
    visualSpec,
    chartSpec,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function askedForConfidence(query: string): boolean {
  return /\b(confidence|certainty|certain|how sure|probability|reliability|trust score)\b/i.test(
    query
  );
}

function detectLearnerLevel(mode: AiModeId, query: string): LearnerLevel {
  if (/\b(kid|child|beginner|basic|simple)\b/i.test(query)) return "basic";
  if (/\b(waec|bece|secondary|high school|igcse|a-?level)\b/i.test(query))
    return "secondary";
  if (mode === "university" || /\b(university|college|undergrad|graduate)\b/i.test(query)) {
    return "university";
  }
  if (/\b(professional|industry|workplace|enterprise)\b/i.test(query)) {
    return "professional";
  }
  return "secondary";
}

function detectExamQuestion(query: string): boolean {
  return /\b(waec|bece|sat|igcse|a-?level|exam|past question|marking scheme)\b/i.test(
    query
  );
}

function inferQueryClass(mode: AiModeId, query: string): QueryClass {
  if (
    hasAcademicIntent(query) ||
    mode === "homework" ||
    mode === "waec" ||
    mode === "gigalearn" ||
    mode === "university" ||
    mode === "coding"
  ) {
    return "academic";
  }
  if (hasCreativeIntent(query) || CONVERSATIONAL_MODES.has(mode)) {
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

function inferResponseMode(mode: AiModeId, query: string): ResponseMode {
  if (hasConversationalIntent(query) || CONVERSATIONAL_MODES.has(mode)) {
    return "conversational";
  }
  if (HIGH_STAKES_MODES.has(mode) || hasHighStakesIntent(query)) {
    return "high_stakes";
  }
  return "educational";
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
      baseScore: 0.32,
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
      baseScore: 0.62,
    });
  }

  const historyCandidates = params.history
    .filter((turn) => turn.role === "user")
    .slice(-MAX_HISTORY_CANDIDATES)
    .map((turn, index) => ({
      kind: "conversation" as const,
      title: `Conversation context ${index + 1} (user)`,
      excerpt: truncateText(turn.content),
      baseScore: 0.24,
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
  responseMode: ResponseMode,
  rankedSources: RankedSource[]
): string | null {
  if (rankedSources.length === 0) return null;
  const header = `Ranked evidence context (${responseMode}, ${queryClass} query):`;
  const lines = rankedSources.map(
    (source) =>
      `[${source.id}] (${source.kind}, score=${source.score}) ${source.title}: ${source.excerpt}`
  );
  return `${header}\n${lines.join("\n")}`;
}

function learnerInstruction(level: LearnerLevel): string {
  switch (level) {
    case "basic":
      return "- Explain with simple words first, then add one practical example.";
    case "secondary":
      return "- Explain for secondary-school learners with clear steps and worked examples.";
    case "university":
      return "- Explain with university-level rigor, definitions, derivations, and concise structure.";
    case "professional":
      return "- Explain with professional depth, practical trade-offs, and implementation guidance.";
    default:
      return "- Explain clearly with examples and practical context.";
  }
}

function buildSystemPromptAddon(params: {
  query: string;
  queryClass: QueryClass;
  responseMode: ResponseMode;
  learnerLevel: LearnerLevel;
  isExamQuestion: boolean;
  isBiographyRequest: boolean;
  confidenceRequested: boolean;
  requiresCitation: boolean;
  hasAnyAttachment: boolean;
  hasImageAttachment: boolean;
  hasDocumentAttachment: boolean;
  hasInlineImageData: boolean;
  rankedSources: RankedSource[];
}): string {
  const conversationalRule =
    params.responseMode === "conversational"
      ? "- Conversational mode: reply naturally and warmly. Do not include transparency notices, confidence scores, citation panels, verification warnings, or evidence sections."
      : "";

  const educationalRule =
    params.responseMode === "educational"
      ? "- Educational mode: teach with concept explanation, step-by-step method, examples, and practical applications. Use tables or diagrams when they improve clarity."
      : "";

  const examRule = params.isExamQuestion
    ? "- Exam solver mode: provide answer, method, full explanation, marking-scheme style steps, and a final answer summary. Include diagrams (Mermaid) when needed for geometry, graphs, circuits, or process flows."
    : "";

  const highStakesRule =
    params.responseMode === "high_stakes"
      ? "- High-stakes mode: verify factual claims against provided evidence before finalizing. Avoid unsupported claims. If evidence is weak, clearly state uncertainty."
      : "";

  const citationRule = params.requiresCitation
    ? "- For factual claims in high-stakes mode, cite only known ranked evidence sources using [S1], [S2], etc. Never invent citations, sources, statistics, people, organizations, or events."
    : params.responseMode === "educational"
      ? "- Citations are optional. Include them only when they improve trustworthiness."
      : "- Do not force citations for casual conversation, opinions, or creative prompts.";

  const confidenceRule =
    params.responseMode === "high_stakes"
      ? "- Confidence scoring is enabled for high-stakes responses."
      : params.confidenceRequested
        ? "- The user requested confidence details; include them briefly if helpful."
        : "- Hide confidence details unless the user explicitly asks.";

  const ocrRule =
    params.hasImageAttachment && hasImageTextExtractionIntent(params.query)
      ? params.hasInlineImageData
        ? "- OCR/image-text tasks: if text is blurry, occluded, or unreadable, state that clearly and do not guess."
        : "- OCR/image-text tasks: no inline image pixels are available. Do not claim successful text extraction."
      : "";

  const multimodalPipelineRule = params.hasAnyAttachment
    ? "- For uploaded files, always run this order before final answers: Input Detection -> Visual Extraction (OCR/handwriting/layout/tables) -> Text Normalization -> Structured Reconstruction -> Reasoning."
    : "";

  const noPretendVisionRule = params.hasAnyAttachment
    ? "- Never claim you analyzed/read/understood an image or document unless extraction actually completed using the uploaded attachment data."
    : "";

  const uncertaintyHandlingRule = params.hasAnyAttachment
    ? "- If handwriting or text is unclear, continue processing, mark unclear parts explicitly, and do not ask the user to retype visible content."
    : "";

  const documentResponseFormatRule = params.hasAnyAttachment
    ? "- For document/image task outputs, use sections in this order when applicable: 1) Summary 2) Extracted Text (OCR) 3) Cleaned Text 4) Structured Interpretation 5) Final Answer."
    : "";

  const documentIntelligenceRule = params.hasDocumentAttachment
    ? "- Detect and handle document types: academic content (exams/assignments/problems), personal documents (notes/biographies/journals), and administrative files (forms/records)."
    : "";

  const biographyRule = params.isBiographyRequest
    ? "- Biography mode (strict): extract names/dates/education/locations/events/achievements; clean grammar and duplicates; organize chronologically (Early Life, Education, Career/Life Journey, Achievements, Personal Details); output OCR Extracted Text, Cleaned Version, Structured Notes, and Final Biography."
    : "";

  const smartVisualRule =
    params.responseMode !== "conversational"
      ? "- Smart visual detection: when a visual would improve understanding, include at least one Mermaid diagram and optionally structured blocks using ```giga-visual (JSON) and ```giga-chart (JSON)."
      : "";

  const visualCoverageRule =
    params.responseMode !== "conversational"
      ? "- Support visual outputs for infographics, brochures, posters, flyers, diagrams, flowcharts, mind maps, timelines, process charts, org charts, study visuals, marketing assets, comparison tables, scientific/circuit/geometry illustrations, and mathematical graphs when relevant."
      : "";

  const sourceHint =
    params.rankedSources.length > 0
      ? `- Use the ${params.rankedSources.length} ranked evidence source(s) before relying on unstated memory.`
      : "- No ranked source context is available beyond the user prompt; keep factual claims conservative.";

  return [
    "Accuracy, Authenticity, and Trustworthiness Engine:",
    "- Prioritize factual correctness, authenticity, and clarity.",
    conversationalRule,
    educationalRule,
    learnerInstruction(params.learnerLevel),
    examRule,
    highStakesRule,
    citationRule,
    confidenceRule,
    ocrRule,
    multimodalPipelineRule,
    noPretendVisionRule,
    uncertaintyHandlingRule,
    documentResponseFormatRule,
    documentIntelligenceRule,
    biographyRule,
    smartVisualRule,
    visualCoverageRule,
    sourceHint,
  ]
    .filter(Boolean)
    .join("\n");
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
  const responseMode = inferResponseMode(params.mode, query);
  const queryClass = inferQueryClass(params.mode, query);
  const learnerLevel = detectLearnerLevel(params.mode, query);
  const isExamQuestion = detectExamQuestion(query);
  const isBiographyRequest = hasBiographyIntent(query);
  const confidenceRequested = askedForConfidence(query);
  const requiresCitation = responseMode === "high_stakes";
  const showConfidenceByDefault = responseMode === "high_stakes";
  const showVerificationByDefault = responseMode === "high_stakes";
  const hasAnyAttachment = attachments.length > 0;
  const hasImageAttachment = attachments.some(
    (attachment) => attachment.kind === "image"
  );
  const hasDocumentAttachment = attachments.some(
    (attachment) => attachment.kind !== "image"
  );
  const hasInlineImageData = attachments.some(
    (attachment) => attachment.kind === "image" && Boolean(attachment.dataUrl)
  );

  const candidates = buildSourceCandidates({ query, attachments, history });
  const rankedSources = rankSources(query, candidates);

  return {
    query,
    queryClass,
    responseMode,
    learnerLevel,
    isExamQuestion,
    isBiographyRequest,
    confidenceRequested,
    requiresCitation,
    showConfidenceByDefault,
    showVerificationByDefault,
    hasAnyAttachment,
    hasImageAttachment,
    hasDocumentAttachment,
    hasInlineImageData,
    systemPromptAddon: buildSystemPromptAddon({
      query,
      queryClass,
      responseMode,
      learnerLevel,
      isExamQuestion,
      isBiographyRequest,
      confidenceRequested,
      requiresCitation,
      hasAnyAttachment,
      hasImageAttachment,
      hasDocumentAttachment,
      hasInlineImageData,
      rankedSources,
    }),
    retrievalContextBlock: buildRetrievalContextBlock(
      queryClass,
      responseMode,
      rankedSources
    ),
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

function confidenceLabel(score: number): "low" | "medium" | "high" {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

function stripVerificationSections(answer: string): string {
  return answer
    .replace(/\n+###\s*(Verification|Evidence|Confidence)[\s\S]*$/i, "")
    .replace(/^Transparency note:[\s\S]*?\n\n/i, "")
    .trim();
}

function removeSourceTags(answer: string): string {
  return answer.replace(/\s*\[S\d+\]/g, "").replace(/\s{2,}/g, " ").trim();
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
  const flags = report.flags.length === 0 ? "none" : report.flags.join(", ");
  const lines = ["### Verification"];
  if (report.confidenceVisible) {
    lines.push(
      `- Confidence: ${report.confidenceLabel} (${report.confidenceScore.toFixed(2)})`
    );
  }
  lines.push(`- Citation count: ${report.citationCount}`);
  lines.push(`- Evidence used: ${sourceSummary}`);
  lines.push(`- Validation flags: ${flags}`);
  return lines.join("\n");
}

function fallbackImageOcrFailureMessage(hasInlineImageData: boolean): string {
  const reason = hasInlineImageData
    ? "I couldn't reliably read the words in the uploaded image from this pass."
    : "I couldn't verify OCR because image pixel data was not available in this request.";
  return `${reason}

Please retry with one of these:
1. Re-upload the image (full resolution, not cropped/compressed).
2. Use a clearer image with higher contrast and minimal blur.
3. Send a close-up crop of just the text area.

I won't guess unreadable text.`;
}

function fallbackHighStakesUnverified(query: string): string {
  return `I can't confidently verify this high-stakes request with the evidence currently available.

To keep this accurate and trustworthy, please provide one of the following:
1. A trusted source excerpt or attachment.
2. The exact dataset/report you want summarized.
3. Permission to proceed with a conservative, clearly-labeled estimate.

Request received: "${truncateText(query, 180)}"`;
}

export function validateAnswerQuality(params: {
  answer: string;
  context: AnswerQualityContext;
}): ValidatedAnswer {
  const originalAnswer = params.answer.trim();
  const citationIds = extractCitationIds(originalAnswer);
  const claimDensity = estimateClaimDensity(originalAnswer);
  const uncertaintyDisclosure = hasUncertaintyDisclosure(originalAnswer);

  let confidence = 0.7;
  const flags: string[] = [];
  const rankedSourceIds = new Set(
    params.context.rankedSources.map((source) => source.id)
  );
  const rankedAttachmentSourceIds = new Set(
    params.context.rankedSources
      .filter((source) => source.kind === "attachment")
      .map((source) => source.id)
  );
  const citedKnownSourceIds = citationIds.filter((id) => rankedSourceIds.has(id));
  const citedAttachmentSourceIds = citationIds.filter((id) =>
    rankedAttachmentSourceIds.has(id)
  );
  const invalidCitationIds = citationIds.filter((id) => !rankedSourceIds.has(id));

  if (invalidCitationIds.length > 0) {
    confidence -= 0.2;
    flags.push("fabricated_citations");
  }

  if (params.context.requiresCitation && citedKnownSourceIds.length === 0) {
    confidence -= 0.22;
    flags.push("missing_citations");
  }

  if (params.context.responseMode === "high_stakes" && claimDensity >= 2) {
    confidence -= 0.1;
    if (citedKnownSourceIds.length === 0) {
      confidence -= 0.16;
      flags.push("unsupported_claims");
    }
  }

  if (params.context.rankedSources.length === 0) {
    confidence -= 0.12;
    flags.push("limited_context_sources");
  }

  if (uncertaintyDisclosure) {
    confidence += 0.05;
  }

  if (params.context.responseMode === "conversational") {
    confidence += 0.08;
  }

  confidence = clamp(confidence, 0.05, 0.98);
  let normalizedAnswer = originalAnswer;

  const isImageTextExtraction =
    params.context.hasImageAttachment &&
    hasImageTextExtractionIntent(params.context.query);
  const ocrNeedsSafeFallback =
    isImageTextExtraction &&
    (confidenceLabel(confidence) === "low" ||
      citedAttachmentSourceIds.length === 0 ||
      !params.context.hasInlineImageData);
  if (ocrNeedsSafeFallback) {
    normalizedAnswer = fallbackImageOcrFailureMessage(
      params.context.hasInlineImageData
    );
    confidence = 0.12;
    flags.push("ocr_not_verified");
  }

  const attachmentCapabilityContradiction =
    params.context.hasAnyAttachment &&
    hasAttachmentInabilityLanguage(originalAnswer);
  if (attachmentCapabilityContradiction) {
    normalizedAnswer = params.context.hasImageAttachment
      ? "Image analysis is currently unavailable. Please try again later or contact support."
      : "The document upload did not complete successfully. Please upload the document again.";
    confidence = Math.min(confidence, 0.1);
    flags.push("attachment_analysis_unavailable");
  }

  if (
    params.context.hasAnyAttachment &&
    hasRetypeInstruction(originalAnswer) &&
    !attachmentCapabilityContradiction
  ) {
    normalizedAnswer =
      "I processed the uploaded content as far as possible. Some parts are unclear due to handwriting or image quality. Please upload a clearer image/document (or a close-up crop), and I will continue extraction without guessing.";
    confidence = Math.min(confidence, 0.3);
    flags.push("retype_request_removed");
  }

  const highStakesNeedsFallback =
    params.context.responseMode === "high_stakes" &&
    !ocrNeedsSafeFallback &&
    (flags.includes("fabricated_citations") || flags.includes("unsupported_claims"));
  if (highStakesNeedsFallback) {
    normalizedAnswer = fallbackHighStakesUnverified(params.context.query);
    confidence = Math.min(confidence, 0.2);
    flags.push("high_stakes_unverified");
  }

  if (shouldAttachAutoVisuals(params.context, normalizedAnswer, flags)) {
    const visualAugmentation = buildAutoVisualAugmentation(
      params.context,
      normalizedAnswer
    );
    if (visualAugmentation) {
      normalizedAnswer = `${normalizedAnswer}\n\n${visualAugmentation}`.trim();
      flags.push("visual_content_generated");
    }
  }

  const confidenceVisibility =
    params.context.showConfidenceByDefault ||
    (params.context.responseMode === "educational" &&
      params.context.confidenceRequested);
  const verificationVisibility =
    params.context.showVerificationByDefault ||
    (params.context.responseMode === "educational" &&
      params.context.confidenceRequested);

  if (params.context.responseMode === "conversational") {
    normalizedAnswer = removeSourceTags(stripVerificationSections(normalizedAnswer));
  } else if (!verificationVisibility) {
    normalizedAnswer = stripVerificationSections(normalizedAnswer);
  }

  const lowConfidence = confidenceLabel(confidence) === "low";
  const shouldShowTransparencyNote =
    lowConfidence &&
    verificationVisibility &&
    params.context.responseMode !== "conversational" &&
    !ocrNeedsSafeFallback;
  if (shouldShowTransparencyNote && !uncertaintyDisclosure) {
    flags.push("missing_uncertainty_disclosure");
  }

  const report: AnswerQualityReport = {
    confidenceScore: Number(confidence.toFixed(3)),
    confidenceLabel: confidenceLabel(confidence),
    responseMode: params.context.responseMode,
    confidenceVisible: confidenceVisibility,
    verificationVisible: verificationVisibility,
    queryClass: params.context.queryClass,
    requiresCitation: params.context.requiresCitation,
    citationCount: citedKnownSourceIds.length,
    sourceCount: params.context.rankedSources.length,
    flags,
  };

  const transparencyPrefix = shouldShowTransparencyNote
    ? "Verification note: confidence is low because available evidence is limited. I am avoiding unsupported claims.\n\n"
    : "";

  const hasVerificationSection = /(^|\n)### Verification\b/.test(normalizedAnswer);
  const verificationBlock =
    report.verificationVisible && !hasVerificationSection
      ? `\n\n${buildVerificationBlock(report, params.context.rankedSources)}`
      : "";

  return {
    content: `${transparencyPrefix}${normalizedAnswer}${verificationBlock}`.trim(),
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
    report.flags.includes("unsupported_claims") ||
    report.flags.includes("fabricated_citations") ||
    report.flags.includes("ocr_not_verified") ||
    report.flags.includes("attachment_analysis_unavailable")
  ) {
    qualityStats.responsesWithHallucinationRisk += 1;
  }
  if (report.verificationVisible) {
    qualityStats.responsesWithVerification += 1;
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
    verificationRate: Number(
      (qualityStats.responsesWithVerification / total).toFixed(3)
    ),
  };
}

export function toRetrievalSystemMessage(
  context: AnswerQualityContext
): ChatCompletionMessage[] {
  if (!context.retrievalContextBlock) return [];
  return [{ role: "system", content: context.retrievalContextBlock }];
}
