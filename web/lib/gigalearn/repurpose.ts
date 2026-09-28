/**
 * Phase 2 content-repurposing workflow.
 *
 * A single lesson converts into notes, quiz, worksheet, assignment,
 * presentation, video script, revision summary or flashcards without the
 * user recreating anything — the active curriculum context travels along.
 */
import type { StudioContext } from "@/lib/gigalearn/studioContext";
import { studioContextIds } from "@/lib/gigalearn/studioContext";
import { getStudioTool, type StudioToolId } from "@/lib/gigalearn/studioTools";

export type RepurposeTargetId =
  | "lesson-notes"
  | "quiz-generator"
  | "worksheet-generator"
  | "assignment-generator"
  | "presentation-generator"
  | "video-script-generator"
  | "revision-guide"
  | "flashcard-generator";

export interface RepurposeTarget {
  id: RepurposeTargetId;
  label: string;
  description: string;
}

export const REPURPOSE_TARGETS: RepurposeTarget[] = [
  { id: "lesson-notes", label: "Notes", description: "Condense the lesson into study notes" },
  { id: "quiz-generator", label: "Quiz", description: "Assess the lesson content" },
  { id: "worksheet-generator", label: "Worksheet", description: "Printable practice activities" },
  { id: "assignment-generator", label: "Assignment", description: "Take-home tasks with marking guide" },
  { id: "presentation-generator", label: "Presentation", description: "Slide-by-slide deck" },
  { id: "video-script-generator", label: "Video script", description: "Narration, scenes and captions" },
  { id: "revision-guide", label: "Revision summary", description: "Key facts and self-tests" },
  { id: "flashcard-generator", label: "Flashcards", description: "Front/back study cards" },
];

export function repurposeTargetsFor(sourceToolId: string): RepurposeTarget[] {
  return REPURPOSE_TARGETS.filter((t) => t.id !== sourceToolId);
}

export function buildRepurposePrompt(args: {
  sourceLabel: string;
  targetId: RepurposeTargetId;
  sourceContent: string;
  context: StudioContext;
}): { prompt: string; backendToolId: string } {
  const tool = getStudioTool(args.targetId);
  const ids = studioContextIds(args.context);
  const contextLine = [
    ids.countryId && `Country id: ${ids.countryId}`,
    ids.curriculumId && `Curriculum id: ${ids.curriculumId}`,
    ids.levelId && `Level id: ${ids.levelId} (grade ${ids.gradeId || "—"})`,
    ids.subjectId && `Subject id: ${ids.subjectId}`,
    ids.strand && `Strand: ${ids.strand}`,
    ids.subStrand && `Sub-strand: ${ids.subStrand}`,
    ids.topic && `Topic: ${ids.topic}`,
  ]
    .filter(Boolean)
    .join("\n");
  const targetLabel = tool?.label ?? args.targetId;
  const prompt = [
    `Repurpose the following ${args.sourceLabel} into a ${targetLabel}. Keep every fact, example and curriculum alignment from the source — do not introduce new topics.`,
    contextLine ? `Curriculum context (stable IDs):\n${contextLine}` : "",
    `Source ${args.sourceLabel}:`,
    args.sourceContent.slice(0, 12000),
  ]
    .filter(Boolean)
    .join("\n\n");
  return { prompt, backendToolId: tool?.backendToolId ?? args.targetId };
}

/** Narrow AI output to a spoken narration script for the GigaEdit teleprompter. */
export function extractNarrationScript(content: string): string {
  const narration = content.match(/##?\s*Narration([\s\S]*?)(?=##?\s|\Z)/i)?.[1]?.trim();
  if (narration) return narration.slice(0, 6000);
  return content.replace(/^#{1,6}\s.*/gm, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 6000);
}
