import type { GigaPersonaId } from "@/lib/personas/gigaPersonas";

const TOOL_PERSONA: Record<string, GigaPersonaId> = {
  "practice-questions": "bece_tutor",
  "exam-prep": "wassce_tutor",
  "revision-guide": "wassce_tutor",
  "homework-explain": "ghana_teacher",
};

/** Client-side mirror of convex/gigaPersonas.resolvePersonaForGigaLearnTool. */
export function resolveGigaLearnPersona(args: {
  toolId?: string;
  curriculum?: string;
}): GigaPersonaId {
  if (args.toolId && TOOL_PERSONA[args.toolId]) {
    return TOOL_PERSONA[args.toolId];
  }

  const curriculum = (args.curriculum ?? "").toLowerCase();
  if (curriculum.includes("wassce")) return "wassce_tutor";
  if (curriculum.includes("bece")) return "bece_tutor";
  return "ghana_teacher";
}
