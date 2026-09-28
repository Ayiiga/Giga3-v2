import { hasValue } from "@/lib/gigalearn/creation/intake";
import { getCreationTemplate, isCreationTemplateId } from "@/lib/gigalearn/creation/templates";
import type { CreationInputs, CreationTemplateId } from "@/lib/gigalearn/creation/types";

export const CREATE_TAB_PATH = "/gigalearn/";
const FIELD_PREFIX = "f_";
const AUTOSTART_KEY = "giga3_creation_autostart";

/**
 * Deep link into the builder. Personal-data fields (CV) are never serialised
 * into URLs; only structural lesson/research details are.
 */
export function buildCreationLink(
  templateId: CreationTemplateId,
  inputs: CreationInputs = {},
  options: { step?: "confirm" | "edit" } = {}
): string {
  const template = getCreationTemplate(templateId);
  const params = new URLSearchParams({ tab: "create", template: templateId });
  if (template) {
    for (const field of template.fields) {
      if (field.personalData) continue;
      const value = inputs[field.id];
      if (!hasValue(value)) continue;
      params.set(`${FIELD_PREFIX}${field.id}`, Array.isArray(value) ? value.join("|") : value);
    }
  }
  if (options.step) params.set("step", options.step);
  return `${CREATE_TAB_PATH}?${params.toString()}`;
}

export type ParsedCreationLink = {
  templateId: CreationTemplateId;
  inputs: CreationInputs;
  step: "confirm" | "edit" | null;
};

export function parseCreationLink(params: URLSearchParams): ParsedCreationLink | null {
  const templateId = params.get("template") ?? "";
  if (!isCreationTemplateId(templateId)) return null;
  const template = getCreationTemplate(templateId)!;
  const inputs: CreationInputs = {};
  for (const field of template.fields) {
    if (field.personalData) continue;
    const raw = params.get(`${FIELD_PREFIX}${field.id}`);
    if (!raw) continue;
    const value = raw.slice(0, 500);
    inputs[field.id] = field.kind === "multichoice" ? value.split("|").filter(Boolean) : value;
  }
  const step = params.get("step");
  return { templateId, inputs, step: step === "confirm" || step === "edit" ? step : null };
}

/** One-shot flag set only when the user confirmed generation in chat (never via a shared URL). */
const AUTOSTART_TTL_MS = 2 * 60_000;

export function markCreationAutostart(templateId: CreationTemplateId): void {
  try {
    sessionStorage.setItem(AUTOSTART_KEY, JSON.stringify({ templateId, at: Date.now() }));
  } catch {
    /* storage unavailable */
  }
}

export function consumeCreationAutostart(templateId: CreationTemplateId): boolean {
  try {
    const raw = sessionStorage.getItem(AUTOSTART_KEY);
    if (!raw) return false;
    sessionStorage.removeItem(AUTOSTART_KEY);
    const parsed = JSON.parse(raw) as { templateId?: string; at?: number };
    return parsed.templateId === templateId && Date.now() - (parsed.at ?? 0) < AUTOSTART_TTL_MS;
  } catch {
    return false;
  }
}
