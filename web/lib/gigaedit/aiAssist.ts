import { storePromptChatHandoff } from "@/lib/chat/promptHandoff";

export type AiAssistKind =
  | "script"
  | "caption"
  | "hook"
  | "hashtags"
  | "video-ideas"
  | "thumbnail"
  | "marketing";

const PROMPTS: Record<AiAssistKind, (topic: string) => string> = {
  script: (topic) =>
    `Write a clear 60-second creator script about "${topic}" for a short vertical video. Include a hook, 3 points, and a call to action. Label the output as AI-generated draft.`,
  caption: (topic) =>
    `Write 3 engaging social captions about "${topic}" for TikTok/Instagram. Keep them mobile-friendly and mark them as AI-generated drafts.`,
  hook: (topic) =>
    `Generate 8 scroll-stopping video hooks about "${topic}". One line each. Mark as AI-generated.`,
  hashtags: (topic) =>
    `Suggest 15 relevant hashtags for a post about "${topic}" targeting creators in Africa/Ghana where relevant. Mark as AI-generated.`,
  "video-ideas": (topic) =>
    `Give 10 short-form video ideas about "${topic}" with a title and one-sentence angle. Mark as AI-generated.`,
  thumbnail: (topic) =>
    `Describe 5 high-CTR YouTube/TikTok thumbnail concepts for "${topic}" (text overlay + visual). Mark as AI-generated creative brief.`,
  marketing: (topic) =>
    `Write a short marketing pack for "${topic}": headline, 2 ad lines, CTA, and a WhatsApp broadcast blurb. Mark as AI-generated draft.`,
};

export function buildAiAssistPrompt(kind: AiAssistKind, topic: string): string {
  const clean = topic.trim() || "my next creation";
  return PROMPTS[kind](clean);
}

/** Hand off to Giga3 Chat — does not call new APIs; uses existing chat handoff. */
export function launchAiAssistInChat(kind: AiAssistKind, topic: string): string {
  const prompt = buildAiAssistPrompt(kind, topic);
  storePromptChatHandoff({
    prompt,
    title: `GigaEdit · ${kind}`,
    sourceId: `gigaedit:${kind}`,
  });
  return prompt;
}

/** Offline-safe local draft generator (no network). Always labeled AI-assisted. */
export function generateLocalCreativeDraft(kind: AiAssistKind, topic: string): string {
  const clean = topic.trim() || "your idea";
  const stamp = new Date().toLocaleString();
  switch (kind) {
    case "hook":
      return [
        `[AI-assisted draft · offline · ${stamp}]`,
        `1. Stop scrolling — ${clean} changes everything.`,
        `2. Nobody told you this about ${clean}.`,
        `3. I tried ${clean} for 7 days…`,
        `4. If you create content, you need this ${clean} tip.`,
        `5. The ${clean} mistake costing you views.`,
      ].join("\n");
    case "hashtags":
      return [
        `[AI-assisted draft · offline · ${stamp}]`,
        `#${clean.replace(/\s+/g, "")} #CreatorTips #Giga3AI #GigaEdit #ShortForm #ContentCreator #AfricaCreators #GhanaCreators #ReelsTips #ViralIdeas`,
      ].join("\n");
    case "caption":
      return [
        `[AI-assisted draft · offline · ${stamp}]`,
        `1) ${clean} — here’s the simple version. Save this for later.`,
        `2) Building in public: my take on ${clean}. What would you add?`,
        `3) Quick tip on ${clean}. Try it today and tag a friend.`,
      ].join("\n\n");
    default:
      return [
        `[AI-assisted draft · offline · ${stamp}]`,
        `Topic: ${clean}`,
        "",
        "Hook: Open with a surprising fact or question.",
        "Body: Share 3 practical points your audience can use today.",
        "CTA: Ask viewers to comment their biggest challenge.",
        "",
        "Tip: Open Chat for a fuller AI rewrite when you are online.",
      ].join("\n");
  }
}
