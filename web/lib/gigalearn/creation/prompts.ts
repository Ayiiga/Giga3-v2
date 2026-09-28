import { formatValue, hasValue } from "@/lib/gigalearn/creation/intake";
import { stagesFor } from "@/lib/gigalearn/creation/templates";
import type {
  ContentProvenance,
  CreationInputs,
  CreationStage,
  CreationTemplate,
  GeneratedSection,
  SourceReference,
} from "@/lib/gigalearn/creation/types";

export const DEMONSTRATION_LABEL = "DEMONSTRATION DATA — NOT REAL RESEARCH FINDINGS";
export const STRUCTURE_INPUT_KEY = "__structure";
export const NOT_ENDORSED_NOTE =
  "Not produced, approved or endorsed by GES, NaCCA or the Ministry of Education.";

const PREVIOUS_SECTION_CHARS = 1500;
const PREVIOUS_TOTAL_CHARS = 6000;

const CURRICULUM_FIELD_IDS = ["strand", "subStrand", "contentStandard", "indicator", "curriculumReference"];

export function hasCurriculumReference(inputs: CreationInputs): boolean {
  return CURRICULUM_FIELD_IDS.some((id) => hasValue(inputs[id]));
}

/** Source references implied by the confirmed inputs (curriculum fields, imported structure). */
export function deriveSourceReferences(
  template: CreationTemplate,
  inputs: CreationInputs,
  extra: SourceReference[] = []
): SourceReference[] {
  const refs: SourceReference[] = [...extra];
  if (template.id === "lesson" && hasCurriculumReference(inputs)) {
    const issuer = formatValue(inputs.curriculumIssuer);
    refs.push({
      kind: "curriculumReference",
      title: issuer ? `${issuer} curriculum reference supplied by user` : "Curriculum reference supplied by user",
      attribution: issuer || undefined,
      usedAs: "factualBasis",
    });
  }
  if (template.id === "research" && hasValue(inputs.references)) {
    refs.push({ kind: "userProvided", title: "References supplied by user", usedAs: "factualBasis" });
  }
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.kind}:${ref.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function provenanceLabel(template: CreationTemplate, sourceReferences: SourceReference[]): string {
  const curriculum = sourceReferences.some((ref) => ref.kind === "curriculumReference");
  if (curriculum) {
    return `Original Giga3-generated ${template.documentNoun} based on the selected curriculum reference.`;
  }
  if (template.id === "rhyme") return "Original Giga3 educational content";
  return `Original Giga3-generated ${template.documentNoun}.`;
}

export function attributionLines(sourceReferences: SourceReference[]): string[] {
  const lines: string[] = [];
  for (const ref of sourceReferences) {
    if (ref.kind === "curriculumReference") {
      lines.push(`Source: ${ref.title}.`);
      if (!lines.includes(NOT_ENDORSED_NOTE)) lines.push(NOT_ENDORSED_NOTE);
    } else if (ref.kind === "importedReference") {
      lines.push(`Structure adapted from a reference supplied by user (headings only; no source text reused).`);
    }
  }
  return lines;
}

function describeInputs(template: CreationTemplate, inputs: CreationInputs): string {
  const lines: string[] = [];
  for (const field of template.fields) {
    const value = inputs[field.id];
    if (!hasValue(value)) continue;
    lines.push(`- ${field.label}: ${formatValue(value)}`);
  }
  return lines.join("\n");
}

function previousSectionsBlock(sections: GeneratedSection[]): string {
  if (sections.length === 0) return "";
  const parts: string[] = [];
  let total = 0;
  for (const section of [...sections].reverse()) {
    const body =
      section.content.length > PREVIOUS_SECTION_CHARS
        ? `${section.content.slice(0, PREVIOUS_SECTION_CHARS)}…`
        : section.content;
    if (total + body.length > PREVIOUS_TOTAL_CHARS) break;
    total += body.length;
    parts.unshift(`### ${section.label}\n${body}`);
  }
  return parts.join("\n\n");
}

export type StagePromptArgs = {
  template: CreationTemplate;
  inputs: CreationInputs;
  stage: CreationStage;
  previousSections: GeneratedSection[];
  demonstrationData: boolean;
  sourceReferences: SourceReference[];
};

/** Prompt + context sent to the existing `gigalearnStudio.generateContent` action. */
export function buildStagePrompt(args: StagePromptArgs): { prompt: string; context: string } {
  const { template, inputs, stage, previousSections, demonstrationData, sourceReferences } = args;
  const stages = stagesFor(template, inputs);
  const index = stages.findIndex((candidate) => candidate.id === stage.id);
  const structure = inputs[STRUCTURE_INPUT_KEY];
  const usesDemo = demonstrationData && (stage.userDataStage || stage.dependsOnFindings);

  const promptLines = [
    `Create part ${index + 1} of ${stages.length} of an original ${template.documentNoun}: ${stage.label}.`,
    stage.instruction,
    `Sections to write (use these as markdown headings):\n${stage.sections.map((s) => `- ${s}`).join("\n")}`,
    `Details confirmed by the user:\n${describeInputs(template, inputs) || "- (none)"}`,
  ];
  if (hasValue(structure)) {
    promptLines.push(
      `Follow this section structure taken from a reference the user supplied (headings only — do not recreate its content):\n${formatValue(structure)}`
    );
  }
  const previous = previousSectionsBlock(previousSections);
  if (previous) {
    promptLines.push(`Sections already written (stay consistent; do not repeat them):\n${previous}`);
  }
  if (usesDemo) {
    promptLines.push(
      `The user asked for DEMONSTRATION data because they have no real data yet. Start the section with the line "${DEMONSTRATION_LABEL}" and label every table and figure the same way. Never present these numbers as real findings.`
    );
  }

  const contextLines = [
    "Rules:",
    ...template.integrityRules.map((rule) => `- ${rule}`),
    "- Write only the requested sections; Giga3 adds the provenance footer itself.",
  ];

  return { prompt: promptLines.join("\n\n"), context: contextLines.join("\n") };
}

/** Enforce the demonstration label client-side, whatever the model returned. */
export function finalizeStageContent(
  content: string,
  args: { stage: CreationStage; demonstrationData: boolean }
): string {
  const text = content.trim();
  const needsDemo = args.demonstrationData && (args.stage.userDataStage || args.stage.dependsOnFindings);
  if (needsDemo && !text.slice(0, 200).includes(DEMONSTRATION_LABEL)) {
    return `> **${DEMONSTRATION_LABEL}**\n\n${text}`;
  }
  return text;
}

export function provenanceFooter(template: CreationTemplate, sourceReferences: SourceReference[]): string {
  return [provenanceLabel(template, sourceReferences), ...attributionLines(sourceReferences)].join(" ");
}

export function continuePrompt(stage: CreationStage | undefined): string | null {
  return stage ? `Continue to ${stage.label}?` : null;
}

export function buildProvenance(args: {
  template: CreationTemplate;
  inputs: CreationInputs;
  sections: GeneratedSection[];
  sourceReferences: SourceReference[];
  createdAt: number;
}): ContentProvenance {
  const { template, inputs, sections, sourceReferences, createdAt } = args;
  return {
    generationType: template.id,
    sourceReferences,
    userInputs: inputs,
    generatedSections: sections.map(({ content: _content, ...meta }) => meta),
    createdAt,
    updatedAt: sections.reduce((latest, s) => Math.max(latest, s.generatedAt), createdAt),
    originalContent: true,
    externalSourcesSupplied: sourceReferences.length > 0,
    citationsRequested: template.id === "research" || hasValue(inputs.references),
    label: provenanceLabel(template, sourceReferences),
  };
}

export function assembleDocument(
  template: CreationTemplate,
  sections: GeneratedSection[],
  sourceReferences: SourceReference[]
): string {
  if (sections.length === 0) return "";
  const body = sections.map((section) => section.content).join("\n\n");
  return `${body}\n\n---\n\n_${provenanceFooter(template, sourceReferences)}_`;
}
