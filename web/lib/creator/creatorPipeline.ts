/**
 * One-click creator pipeline entry — reuses existing Media Studio, GigaEdit, GigaSocial.
 * Does not run generation itself; builds prompts and deep links.
 */

export type CreatorPipelineStepId =
  | "idea"
  | "script"
  | "storyboard"
  | "generate"
  | "voice"
  | "captions"
  | "edit"
  | "publish";

export const CREATOR_PIPELINE_STEPS: Array<{
  id: CreatorPipelineStepId;
  label: string;
  description: string;
}> = [
  { id: "idea", label: "Idea", description: "Your topic or hook" },
  { id: "script", label: "Script", description: "AI script in Media Studio pre-production" },
  { id: "storyboard", label: "Storyboard", description: "Scene prompts from your script" },
  { id: "generate", label: "Generate", description: "Video AI uses existing credit billing" },
  { id: "voice", label: "Voice", description: "Teleprompter or narration in GigaEdit" },
  { id: "captions", label: "Captions", description: "Edit and caption in GigaEdit" },
  { id: "edit", label: "Edit", description: "Trim, join, polish" },
  { id: "publish", label: "Publish", description: "Share on GigaSocial" },
];

export function buildCreatorPipelineMediaUrl(idea: string): string {
  const prompt = idea.trim();
  const params = new URLSearchParams();
  params.set("tab", "video");
  params.set("mode", "preprod");
  if (prompt) params.set("idea", prompt.slice(0, 500));
  return `/media/?${params.toString()}`;
}

export function buildCreatorPipelineTeleprompterUrl(script: string): string {
  return `/gigaedit/?tab=teleprompter&record=1`;
}

export function starterScriptFromIdea(idea: string, durationSec = 45): string {
  const topic = idea.trim() || "your topic";
  return `Create a ${durationSec}-second video about ${topic}. Include a strong hook, 3 clear scenes, and a call to action.`;
}
