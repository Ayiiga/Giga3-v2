import type { CreationTemplateId } from "@/lib/gigalearn/creation/types";

/**
 * Analyse a user-supplied reference document for STRUCTURE only.
 *
 * Output is limited to canonical, generic section names from the dictionary
 * below plus short curriculum codes. The source text itself is never returned,
 * stored or sent for generation.
 */

type CanonicalHeading = { label: string; pattern: RegExp; types: CreationTemplateId[] };

const CANONICAL_HEADINGS: CanonicalHeading[] = [
  { label: "Abstract", pattern: /^abstract$/, types: ["research"] },
  { label: "Declaration", pattern: /^declaration$/, types: ["research"] },
  { label: "Acknowledgement", pattern: /^acknowledg(e)?ments?$/, types: ["research", "book"] },
  { label: "Dedication", pattern: /^dedication$/, types: ["research", "book"] },
  { label: "Table of contents", pattern: /^(table of )?contents$/, types: ["research", "book"] },
  { label: "Introduction", pattern: /^(general )?introduction$/, types: ["research", "book", "lesson"] },
  { label: "Background to the study", pattern: /^background( (to|of) the study)?$/, types: ["research"] },
  { label: "Statement of the problem", pattern: /^(statement of (the )?problem|problem statement)$/, types: ["research"] },
  { label: "Purpose of the study", pattern: /^purpose of (the )?study$/, types: ["research"] },
  { label: "Research objectives", pattern: /^((research|specific) )?objectives( of (the )?study)?$/, types: ["research"] },
  { label: "Research questions", pattern: /^research questions?$/, types: ["research"] },
  { label: "Research hypotheses", pattern: /^(research )?hypothes[ie]s$/, types: ["research"] },
  { label: "Significance of the study", pattern: /^significance( of (the )?study)?$/, types: ["research"] },
  { label: "Scope of the study", pattern: /^(scope|delimitations?)( of (the )?study)?$/, types: ["research"] },
  { label: "Limitations", pattern: /^limitations?( of (the )?study)?$/, types: ["research"] },
  { label: "Organisation of the study", pattern: /^organi[sz]ation of (the )?study$/, types: ["research"] },
  { label: "Literature review", pattern: /^(review of (related )?literature|literature review)$/, types: ["research"] },
  { label: "Conceptual review", pattern: /^conceptual review$/, types: ["research"] },
  { label: "Theoretical review", pattern: /^theoretical (review|framework)$/, types: ["research"] },
  { label: "Empirical review", pattern: /^empirical review$/, types: ["research"] },
  { label: "Conceptual framework", pattern: /^conceptual framework$/, types: ["research"] },
  { label: "Methodology", pattern: /^(research )?methodology$/, types: ["research"] },
  { label: "Research design", pattern: /^research design$/, types: ["research"] },
  { label: "Study area", pattern: /^(study area|area of (the )?study|profile of (the )?study area)$/, types: ["research"] },
  { label: "Population", pattern: /^(target )?population( of (the )?study)?$/, types: ["research"] },
  { label: "Sample and sampling procedure", pattern: /^(sample( size)?( and sampling( procedure| technique)?s?)?|sampling (procedure|technique)s?)$/, types: ["research"] },
  { label: "Data collection", pattern: /^(data collection( procedures?| instruments?)?|sources? of data|instruments?)$/, types: ["research"] },
  { label: "Data analysis", pattern: /^(data (processing and )?analysis|method of data analysis)$/, types: ["research"] },
  { label: "Ethical considerations", pattern: /^ethical (considerations?|issues)$/, types: ["research"] },
  { label: "Results", pattern: /^(results|findings|presentation of (results|findings))( and discussions?)?$/, types: ["research"] },
  { label: "Discussion", pattern: /^discussions?( of (the )?(results|findings))?$/, types: ["research"] },
  { label: "Summary", pattern: /^summary( of (the )?findings)?$/, types: ["research", "lesson"] },
  { label: "Conclusions", pattern: /^conclusions?$/, types: ["research", "book"] },
  { label: "Recommendations", pattern: /^recommendations?$/, types: ["research"] },
  { label: "Areas for further research", pattern: /^(areas|suggestions?) for further (research|studies)$/, types: ["research"] },
  { label: "References", pattern: /^(references|bibliography|works cited)$/, types: ["research", "book"] },
  { label: "Appendices", pattern: /^appendi(x|ces)$/, types: ["research"] },
  { label: "Preface", pattern: /^(preface|foreword)$/, types: ["book"] },
  { label: "Glossary", pattern: /^glossary$/, types: ["book"] },
  { label: "Strand", pattern: /^strands?$/, types: ["lesson"] },
  { label: "Sub-strand", pattern: /^sub[- ]?strands?$/, types: ["lesson"] },
  { label: "Content standard", pattern: /^content standards?$/, types: ["lesson"] },
  { label: "Indicator", pattern: /^(learning )?indicators?$/, types: ["lesson"] },
  { label: "Exemplars", pattern: /^exemplars?$/, types: ["lesson"] },
  { label: "Learning outcomes", pattern: /^learning (outcomes?|objectives?)$/, types: ["lesson"] },
  { label: "Core competencies", pattern: /^core competenc(y|ies)$/, types: ["lesson"] },
  { label: "Teaching/learning resources", pattern: /^(teaching( and|\/)? ?learning )?(resources|materials)$/, types: ["lesson"] },
  { label: "Starter activity", pattern: /^(starter|phase 1|introduction activity)$/, types: ["lesson"] },
  { label: "Main activities", pattern: /^(main( activities)?|phase 2|new learning)$/, types: ["lesson"] },
  { label: "Plenary / reflection", pattern: /^(plenary|reflection|phase 3)$/, types: ["lesson"] },
  { label: "Assessment", pattern: /^assessments?$/, types: ["lesson"] },
  { label: "Key vocabulary", pattern: /^(key(words| words| vocabulary))$/, types: ["lesson"] },
  { label: "Professional summary", pattern: /^(professional )?(summary|profile)$/, types: ["cv"] },
  { label: "Career objective", pattern: /^(career )?objective$/, types: ["cv"] },
  { label: "Work experience", pattern: /^(work|professional|employment) (experience|history)$|^experience$/, types: ["cv"] },
  { label: "Education", pattern: /^(education(al background)?|academic (background|qualifications?))$/, types: ["cv"] },
  { label: "Skills", pattern: /^((key|core|technical) )?skills$/, types: ["cv"] },
  { label: "Certifications", pattern: /^certifications?$/, types: ["cv"] },
  { label: "Achievements", pattern: /^(achievements?|awards?)$/, types: ["cv"] },
  { label: "Leadership", pattern: /^leadership( roles| experience)?$/, types: ["cv"] },
  { label: "Volunteer experience", pattern: /^volunteer(ing)?( experience| work)?$/, types: ["cv"] },
  { label: "Hobbies / interests", pattern: /^(hobbies|interests)( and (hobbies|interests))?$/, types: ["cv"] },
  { label: "Referees", pattern: /^(referees?|references)$/, types: ["cv"] },
];

const TYPE_KEYWORDS: Record<CreationTemplateId, RegExp[]> = {
  research: [/\bchapter (one|two|three|four|five|1|2|3|4|5)\b/i, /\bmethodology\b/i, /\brespondents?\b/i, /\bresearch questions?\b/i, /\bliterature\b/i, /\babstract\b/i],
  lesson: [/\bsub[- ]?strand\b/i, /\bcontent standard\b/i, /\bindicators?\b/i, /\bexemplars?\b/i, /\blesson\b/i, /\blearners?\b/i, /\bscheme of (learning|work)\b/i],
  cv: [/\bcurriculum vitae\b/i, /\bwork experience\b/i, /\breferees?\b/i, /\bskills\b/i, /\b(date of birth|nationality)\b/i],
  book: [/\bpreface\b/i, /\bglossary\b/i, /\bforeword\b/i, /\bchapter\b/i],
  quiz: [/\banswer key\b/i, /\bquestions?\b/i, /\b(true|false)\b/i],
  rhyme: [/\brhymes?\b/i, /\bverse\b/i, /\bchorus\b/i],
};

export type CurriculumFields = Partial<Record<"strand" | "subStrand" | "contentStandard" | "indicator", string>>;

export type PersonalDataKind = "email" | "phone" | "dateOfBirth" | "postalAddress";

export interface ReferenceAnalysis {
  documentType: CreationTemplateId | "unknown";
  headings: string[];
  curriculumFields: CurriculumFields;
  indicatorCodes: string[];
  personalDataFound: PersonalDataKind[];
  wordCount: number;
}

const MAX_FIELD_CHARS = 120;

function normaliseLine(line: string): string {
  return line
    .toLowerCase()
    .replace(/^(chapter\s+\w+|section\s+\w+)[\s:.–-]*/i, "")
    .replace(/^[\d.)\s]+/, "")
    .replace(/[:.\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectPersonalData(text: string): PersonalDataKind[] {
  const found = new Set<PersonalDataKind>();
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) found.add("email");
  if (/(\+?\d[\d\s-]{8,}\d)/.test(text)) found.add("phone");
  if (/\b(date of birth|d\.o\.b)\b/i.test(text)) found.add("dateOfBirth");
  if (/\b(p\.?\s?o\.?\s?box|post office box|digital address)\b/i.test(text)) found.add("postalAddress");
  return [...found];
}

function shortValue(raw: string): string {
  const value = raw.replace(/\s+/g, " ").trim();
  return value.length > MAX_FIELD_CHARS ? `${value.slice(0, MAX_FIELD_CHARS).trimEnd()}…` : value;
}

export function analyzeReferenceDocument(text: string): ReferenceAnalysis {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headings: string[] = [];
  const scores: Record<CreationTemplateId, number> = { research: 0, lesson: 0, cv: 0, book: 0, quiz: 0, rhyme: 0 };

  for (const line of lines) {
    if (line.split(/\s+/).length > 10) continue;
    const normalised = normaliseLine(line);
    const match = CANONICAL_HEADINGS.find((heading) => heading.pattern.test(normalised));
    if (match && !headings.includes(match.label)) {
      headings.push(match.label);
      for (const type of match.types) scores[type] += 2;
    }
  }

  for (const [type, patterns] of Object.entries(TYPE_KEYWORDS) as Array<[CreationTemplateId, RegExp[]]>) {
    for (const pattern of patterns) if (pattern.test(text)) scores[type] += 1;
  }

  const personalDataFound = detectPersonalData(text);
  if (personalDataFound.length) scores.cv += 1;

  const curriculumFields: CurriculumFields = {};
  const fieldPatterns: Array<[keyof CurriculumFields, RegExp]> = [
    ["subStrand", /^\s*sub[- ]?strand\s*\d*\s*[:–-]\s*(.+)$/im],
    ["strand", /^\s*strand\s*\d*\s*[:–-]\s*(.+)$/im],
    ["contentStandard", /^\s*content standard\s*[:–-]\s*(.+)$/im],
    ["indicator", /^\s*(?:learning )?indicator\s*[:–-]\s*(.+)$/im],
  ];
  for (const [key, pattern] of fieldPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) curriculumFields[key] = shortValue(match[1]);
  }

  const indicatorCodes = [...new Set(text.match(/\bB\d{1,2}(?:\.\d{1,2}){2,4}\b/g) ?? [])].slice(0, 12);

  const ranked = (Object.entries(scores) as Array<[CreationTemplateId, number]>).sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = ranked[0]!;

  return {
    documentType: bestScore >= 3 ? bestType : "unknown",
    headings,
    curriculumFields,
    indicatorCodes,
    personalDataFound,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

export const REFERENCE_TRANSFORMATION_NOTICE =
  "Giga3 keeps only the structure (section names and short curriculum codes). It will not rewrite the source text — you supply your own facts and Giga3 creates an original version. If the reference is someone else's creative work, you may still need their permission to reuse its content, and citations to sources you rely on should be kept.";
