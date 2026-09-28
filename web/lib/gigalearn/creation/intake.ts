import type {
  CreationInputs,
  CreationStage,
  CreationTemplate,
  FieldValue,
  GeneratedSection,
  IntakeField,
} from "@/lib/gigalearn/creation/types";

export function hasValue(value: FieldValue | undefined): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.some((entry) => entry.trim().length > 0);
  return value.trim().length > 0;
}

export function formatValue(value: FieldValue | undefined): string {
  if (value == null) return "";
  return Array.isArray(value) ? value.filter((v) => v.trim()).join(", ") : value.trim();
}

/** Fill template defaults without overwriting anything the user supplied. */
export function withDefaults(template: CreationTemplate, inputs: CreationInputs): CreationInputs {
  const next: CreationInputs = { ...inputs };
  for (const field of template.fields) {
    if (!hasValue(next[field.id]) && field.defaultValue != null) {
      next[field.id] = field.defaultValue;
    }
  }
  return next;
}

/**
 * Next upfront question to ask. Fields already answered (or explicitly skipped)
 * are not asked again, so prefilled chat answers shorten the intake.
 */
export function nextIntakeField(
  template: CreationTemplate,
  inputs: CreationInputs,
  skipped: ReadonlySet<string> = new Set()
): IntakeField | null {
  return (
    template.fields.find(
      (field) => field.askUpfront && !hasValue(inputs[field.id]) && !skipped.has(field.id)
    ) ?? null
  );
}

export function upfrontFields(template: CreationTemplate): IntakeField[] {
  return template.fields.filter((field) => field.askUpfront);
}

export function missingRequired(template: CreationTemplate, inputs: CreationInputs): IntakeField[] {
  return template.fields.filter((field) => field.required && !hasValue(inputs[field.id]));
}

export function summaryRows(
  template: CreationTemplate,
  inputs: CreationInputs
): Array<{ id: string; label: string; value: string }> {
  return template.fields
    .filter((field) => hasValue(inputs[field.id]))
    .map((field) => ({ id: field.id, label: field.label, value: formatValue(inputs[field.id]) }));
}

export type NormalizedAnswer = { ok: true; value: FieldValue } | { ok: false; error: string };

function matchOption(field: IntakeField, raw: string): string | null {
  const options = field.options ?? [];
  const trimmed = raw.trim();
  const asIndex = Number(trimmed);
  if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= options.length) {
    return options[asIndex - 1]!;
  }
  const lower = trimmed.toLowerCase();
  const exact = options.find((option) => option.toLowerCase() === lower);
  if (exact) return exact;
  const prefix = options.find((option) => option.toLowerCase().startsWith(lower) && lower.length >= 3);
  return prefix ?? null;
}

/** Validate a typed answer (builder text box or chat message) for one field. */
export function normalizeAnswer(field: IntakeField, raw: FieldValue): NormalizedAnswer {
  if (Array.isArray(raw)) {
    const cleaned = raw.map((entry) => entry.trim()).filter(Boolean);
    if (field.required && cleaned.length === 0) return { ok: false, error: "Choose at least one option." };
    return { ok: true, value: cleaned };
  }
  const text = raw.trim();
  if (!text) {
    return field.required ? { ok: false, error: "This detail is needed to continue." } : { ok: true, value: "" };
  }
  switch (field.kind) {
    case "number": {
      const match = text.match(/\d+/);
      const value = match ? Number(match[0]) : NaN;
      if (!Number.isFinite(value)) return { ok: false, error: "Please enter a number." };
      if (field.min != null && value < field.min) return { ok: false, error: `Please enter at least ${field.min}.` };
      if (field.max != null && value > field.max) return { ok: false, error: `Please enter at most ${field.max}.` };
      return { ok: true, value: String(value) };
    }
    case "choice": {
      const option = matchOption(field, text);
      if (option) return { ok: true, value: option };
      if (field.allowCustom) return { ok: true, value: text };
      return { ok: false, error: `Please choose one of: ${(field.options ?? []).join(", ")}.` };
    }
    case "multichoice": {
      const parts = text.split(/[,;\n]|\band\b/i).map((part) => part.trim()).filter(Boolean);
      const values: string[] = [];
      for (const part of parts) {
        const option = matchOption(field, part);
        if (option) values.push(option);
        else if (field.allowCustom) values.push(part);
        else return { ok: false, error: `"${part}" is not an option. Choose from: ${(field.options ?? []).join(", ")}.` };
      }
      return { ok: true, value: [...new Set(values)] };
    }
    default:
      return { ok: true, value: text };
  }
}

export type StageReadiness =
  | { ready: true }
  | { ready: false; reason: "missingFields"; missing: IntakeField[]; message: string }
  | { ready: false; reason: "needsFindings"; message: string };

/**
 * Research integrity gate. Stages that describe methods or findings only run when
 * the user has supplied the real details, or has explicitly opted into clearly
 * labelled demonstration data.
 */
export function stageReadiness(
  template: CreationTemplate,
  stage: CreationStage,
  inputs: CreationInputs,
  options: { demonstrationData: boolean; sections: GeneratedSection[] }
): StageReadiness {
  const requires = stage.requires ?? [];
  const missing = template.fields.filter(
    (field) => requires.includes(field.id) && !hasValue(inputs[field.id])
  );
  const demoCovers = options.demonstrationData && stage.userDataStage;
  if (missing.length > 0 && !demoCovers) {
    return {
      ready: false,
      reason: "missingFields",
      missing,
      message: stage.requiresMessage ?? "Some details are needed before this section can be written.",
    };
  }
  if (stage.dependsOnFindings) {
    const hasFindings =
      hasValue(inputs.collectedData) ||
      options.demonstrationData ||
      options.sections.some((section) => {
        const source = stagesById(template, inputs).get(section.stageId);
        return Boolean(source?.userDataStage);
      });
    if (!hasFindings) {
      return {
        ready: false,
        reason: "needsFindings",
        message: "This section must be based on your findings. Provide your collected data and generate the results first.",
      };
    }
  }
  return { ready: true };
}

function stagesById(template: CreationTemplate, inputs: CreationInputs): Map<string, CreationStage> {
  const stages = typeof template.stages === "function" ? template.stages(inputs) : template.stages;
  return new Map(stages.map((stage) => [stage.id, stage]));
}
