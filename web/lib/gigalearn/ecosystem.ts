/**
 * Phase 3 Giga3 ecosystem moves (additive).
 *
 * Reuses existing infrastructure — no parallel generators:
 * - Lesson → AI Studio image: Media Studio deep link with an educational
 *   prompt (`buildImageStudioActionUrl`).
 * - Lesson → GigaEdits video: existing teleprompter script handoff
 *   (`saveTeleprompterScript` → `/gigaedit`).
 * - Quiz → social-ready graphic: Media Studio thumbnail/poster link.
 * - Revision note → short-form video: teleprompter handoff of a condensed
 *   script (recorded with the existing GigaEdit flow).
 */
import { buildImageStudioActionUrl } from "@/lib/chat/imageStudioLinks";

export type EcosystemDestination = "ai-studio-image" | "gigaedits-video" | "social-graphic" | "short-video";

export interface EcosystemMove {
  id: EcosystemDestination;
  label: string;
  description: string;
}

export const ECOSYSTEM_MOVES: EcosystemMove[] = [
  { id: "ai-studio-image", label: "AI Studio image", description: "Turn this lesson into an educational image" },
  { id: "gigaedits-video", label: "GigaEdits video", description: "Narrate it with the teleprompter recorder" },
  { id: "social-graphic", label: "Social graphic", description: "Make a shareable study graphic" },
  { id: "short-video", label: "Short video", description: "Condense revision into a short-form script" },
];

/** Educational image prompt grounded in the lesson topic. */
export function educationalImagePrompt(topic: string, subject: string, grade: string): string {
  const clean = (topic || subject || "learning").slice(0, 160);
  return `Educational illustration for ${grade || "students"} studying ${clean} (${subject || "general"}): clear, friendly, labeled diagram style with African classroom context, bright and readable.`;
}

/** Media Studio URL for an AI Studio image from a lesson. */
export function aiStudioImageUrl(topic: string, subject: string, grade: string): string {
  const params = new URLSearchParams({
    tab: "image",
    category: "anime_art",
    template: "ai-images",
    prompt: educationalImagePrompt(topic, subject, grade),
    action: "generate",
  });
  return `/media?${params.toString()}`;
}

/** Media Studio URL for a social-ready educational graphic from a quiz. */
export function socialGraphicUrl(title: string): string {
  return buildImageStudioActionUrl("thumbnail");
}

/** Condense a revision note into a short-form narration script. */
export function shortVideoScript(content: string, topic: string): string {
  const sentences = content
    .replace(/^#{1,6}\s.*/gm, "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 6);
  const hook = topic ? `Quick revision: ${topic}.` : "Quick revision.";
  return [hook, "", ...sentences, "", "Follow for more bite-size revision."].join("\n");
}
