export type ContentSourceType = "idea" | "text" | "product";

export type ContentRecommendation = {
  title: string;
  detail: string;
  toolId: "content-ideas" | "social-post" | "caption-generator";
};

const RECOMMENDATIONS: Record<ContentSourceType, ContentRecommendation[]> = {
  idea: [
    { title: "Build a content plan", detail: "Turn your idea into practical post and video concepts.", toolId: "content-ideas" },
    { title: "Write a social post", detail: "Create a clear first version for your audience.", toolId: "social-post" },
  ],
  text: [
    { title: "Strengthen the message", detail: "Find clearer hooks, structure, and calls to action.", toolId: "caption-generator" },
    { title: "Create platform versions", detail: "Adapt the core message for social channels.", toolId: "social-post" },
  ],
  product: [
    { title: "Plan a product campaign", detail: "Generate content angles without changing your product listing.", toolId: "content-ideas" },
    { title: "Write a product post", detail: "Create a benefit-led social post for a chosen audience.", toolId: "social-post" },
  ],
};

export function contentRecommendations(sourceType: ContentSourceType): ContentRecommendation[] {
  return RECOMMENDATIONS[sourceType];
}

/**
 * A transparent heuristic, not a prediction of reach or virality.
 * It only helps users identify basic content-strength improvements.
 */
export function contentPotential(input: string): { score: number; advice: string } {
  const text = input.trim();
  if (!text) return { score: 0, advice: "Add an idea or draft to receive practical suggestions." };

  let score = 35;
  if (text.length >= 80) score += 15;
  if (/[?!"”]/.test(text)) score += 10;
  if (/\b(you|your|people|customers|students)\b/i.test(text)) score += 10;
  if (/\b(try|learn|discover|start|watch|share|shop)\b/i.test(text)) score += 10;
  const finalScore = Math.min(score, 80);

  return {
    score: finalScore,
    advice:
      finalScore < 60
        ? "Start with a clearer hook and one specific audience benefit."
        : "Your draft has useful building blocks. Make the first line and call to action more specific.",
  };
}

export function isContentGrowthEngineEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GIGA3_CONTENT_GROWTH_ENGINE_ENABLED === "true";
}
