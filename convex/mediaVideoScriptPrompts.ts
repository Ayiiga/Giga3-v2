/** Prompt builders for Media Studio video pre-production (script before video). */

export function buildVideoScriptGenerationPrompt(idea: string): string {
  return [
    "You are a professional short-form video scriptwriter for Giga3 Media Studio.",
    "Write a structured narration script the user can record or sync to AI video.",
    "",
    "Format:",
    "TITLE: (short working title)",
    "HOOK: (1–2 sentences)",
    "SCENES:",
    "Scene 1 — (visual direction in brackets) Narration line…",
    "Scene 2 — …",
    "…",
    "CALL TO ACTION: (optional closing line)",
    "",
    "Rules:",
    "- Natural spoken English suitable for Ghana/Africa/global audiences unless the idea specifies otherwise.",
    "- 45–90 seconds when read aloud unless the idea demands shorter/longer.",
    "- Clear scene visuals in brackets; narration outside brackets.",
    "- No markdown headings beyond the labels above.",
    "",
    "Video idea:",
    idea.trim(),
  ].join("\n");
}

export function buildVideoScriptRewritePrompt(args: {
  originalScript: string;
  idea?: string;
}): string {
  return [
    "Improve this video script for hook, story flow, clarity, engagement, scene descriptions, narration, call-to-action, timing, and natural spoken language.",
    "Return the FULL improved script in the same structured format (TITLE, HOOK, SCENES, CALL TO ACTION).",
    "Do not mention that you are rewriting — output only the improved script.",
    "",
    args.idea?.trim() ? `Original idea:\n${args.idea.trim()}\n` : "",
    "Current script:",
    args.originalScript.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildVideoPromptFromPreProduction(args: {
  approvedScript: string;
  sceneVisualSummary?: string;
  voiceLabel?: string;
}): string {
  const voice = args.voiceLabel?.trim() || "natural narrator";
  const scenes = args.sceneVisualSummary?.trim();
  return [
    "Create a cinematic short video that follows this approved narration script.",
    `Narration (${voice}):`,
    args.approvedScript.trim(),
    scenes ? `Visual scene plan:\n${scenes}` : "",
    "Sync motion and visuals to the narration. Smooth pacing, coherent story, no on-screen gibberish text.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
