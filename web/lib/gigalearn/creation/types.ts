/**
 * Giga3 creation engine types.
 *
 * Templates describe reusable STRUCTURE (sections, fields, stages). They never
 * carry source wording from reference documents — users supply their own facts
 * and Giga3 generates original text from that structure.
 */

export type CreationTemplateId = "lesson" | "research" | "book" | "cv" | "quiz" | "rhyme";

export type FieldValue = string | string[];
export type CreationInputs = Record<string, FieldValue>;

export type IntakeFieldKind = "text" | "longtext" | "choice" | "multichoice" | "number";

export interface IntakeField {
  id: string;
  /** Short label for the confirmation summary, e.g. "Subject". */
  label: string;
  /** Progressive intake question, e.g. "What subject are you teaching?". */
  question: string;
  kind: IntakeFieldKind;
  required: boolean;
  /** Asked during the upfront intake. Stage-only fields are requested when a stage needs them. */
  askUpfront: boolean;
  options?: string[];
  /** Choice fields accept a typed answer that is not in `options`. */
  allowCustom?: boolean;
  placeholder?: string;
  hint?: string;
  defaultValue?: FieldValue;
  /** The user's own personal details (CV). Never prefilled, never put in URLs. */
  personalData?: boolean;
  min?: number;
  max?: number;
}

export interface CreationStage {
  id: string;
  /** Short label used in "Continue to …?" prompts. */
  label: string;
  /** Structural headings this stage produces. */
  sections: string[];
  instruction: string;
  /** Field ids that must hold real user-provided values before this stage may run. */
  requires?: string[];
  /** Shown when `requires` is incomplete, e.g. "I need your actual sample size…". */
  requiresMessage?: string;
  /** Results-style stage: needs collected data or explicitly labelled demonstration data. */
  userDataStage?: boolean;
  /** Depends on findings from an earlier user-data stage. */
  dependsOnFindings?: boolean;
}

export interface CreationTemplate {
  id: CreationTemplateId;
  label: string;
  emoji: string;
  tagline: string;
  /** Singular noun used in labels, e.g. "lesson", "research project". */
  documentNoun: string;
  /** Existing GigaLearn backend tool id sent to `gigalearnStudio.generateContent`. */
  backendToolId: string;
  fields: IntakeField[];
  /** Fixed stages, or a builder for templates whose stage count depends on inputs (books). */
  stages: CreationStage[] | ((inputs: CreationInputs) => CreationStage[]);
  integrityRules: string[];
}

export type SourceReferenceKind = "userProvided" | "curriculumReference" | "importedReference";

export interface SourceReference {
  kind: SourceReferenceKind;
  title: string;
  attribution?: string;
  /** "structure" = headings/field types only; "factualBasis" = short codes such as indicators. */
  usedAs: "structure" | "factualBasis";
}

export interface GeneratedSection {
  stageId: string;
  label: string;
  content: string;
  generatedAt: number;
  demonstrationData: boolean;
  provider?: string;
}

export interface ContentProvenance {
  generationType: CreationTemplateId;
  sourceReferences: SourceReference[];
  userInputs: CreationInputs;
  generatedSections: Array<Omit<GeneratedSection, "content">>;
  createdAt: number;
  updatedAt: number;
  originalContent: true;
  externalSourcesSupplied: boolean;
  citationsRequested: boolean;
  label: string;
}

export interface CreationDraft {
  id: string;
  templateId: CreationTemplateId;
  inputs: CreationInputs;
  sections: GeneratedSection[];
  sourceReferences: SourceReference[];
  demonstrationData: boolean;
  provenance?: ContentProvenance;
  createdAt: number;
  updatedAt: number;
}
