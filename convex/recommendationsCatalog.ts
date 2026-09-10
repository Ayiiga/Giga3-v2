import type { GigaFeatureId } from "./entitlements";
import {
  getPersonaDefinition,
  isValidPersonaId,
  type GigaPersonaId,
} from "./gigaPersonas";

export const RECOMMENDATION_PROMPT = `
You are Giga3 Recommender — Africa's AI Super App discovery engine.
GOAL: Recommend 3-5 relevant next actions inside Giga3.
RULES:
1. Personalize only from provided inputs. Never invent user history or PII.
2. Ghana-first: BECE/WASSCE, Ghana News, local business when relevant.
3. Safe: No politics/tribal bias, no harmful, no financial guarantee, no medical diagnosis.
4. Only in-app actions: personas, prompts, lessons, templates, studio.
5. Diversity: 60% relevant to intent, 40% exploratory.
6. Respect entitlements: Mark Pro features.
7. Output JSON only with recommendations array.
`.trim();

export type RecommendationSurface =
  | "chat"
  | "learn"
  | "social"
  | "edit"
  | "studio"
  | "marketplace";

export type RecommendationEntitlement = "free" | "pro";

export type RecommendationItem = {
  title: string;
  action: string;
  prompt: string;
  reason: string;
  entitlement: RecommendationEntitlement;
  personaId?: string;
};

export type RecommendationCandidate = RecommendationItem & {
  requiredFeature?: GigaFeatureId;
  freeAlternative?: RecommendationItem;
  weight?: number;
};

export const LEARN_LINK: RecommendationItem = {
  title: "GigaLearn practice",
  action: "/gigalearn/",
  prompt: "Open GigaLearn for structured study and quizzes.",
  reason: "Learn → Practice → Test flow",
  entitlement: "free",
};

export const STUDIO_CANDIDATE: RecommendationCandidate = {
  title: "Media Studio image",
  action: "/media/?tab=image",
  prompt: "Generate a social post image for my project.",
  reason: "Turn ideas into visuals",
  entitlement: "free",
  requiredFeature: "media_studio",
  freeAlternative: LEARN_LINK,
};

const CHAT_PERSONA_STARTERS: RecommendationItem[] = [
  {
    title: "BECE Tutor",
    action: "persona:bece_tutor",
    prompt: "Help me revise BECE maths with practice questions.",
    reason: "Popular for JHS exam prep",
    entitlement: "free",
    personaId: "bece_tutor",
  },
  {
    title: "Ghana News Analyst",
    action: "persona:ghana_news_analyst",
    prompt: "What are the latest Ghana headlines today?",
    reason: "Verified Ghana news with sources",
    entitlement: "free",
    personaId: "ghana_news_analyst",
  },
];

export function personaCandidates(personaId: GigaPersonaId): RecommendationCandidate[] {
  const persona = getPersonaDefinition(personaId);
  const primary = persona.suggestedActions[0] ?? "Help me with my next task.";
  const secondary = persona.suggestedActions[1] ?? primary;

  if (personaId === "ghana_news_analyst") {
    return [
      {
        title: "Latest Ghana headlines",
        action: "chat:send",
        prompt: "What is the latest Ghana news today with sources?",
        reason: "Live news with verification labels",
        entitlement: "free",
        personaId,
        weight: 3,
      },
      {
        title: "Compare developing stories",
        action: "chat:send",
        prompt: secondary,
        reason: `Continue with ${persona.label}`,
        entitlement: "free",
        personaId,
        weight: 2,
      },
    ];
  }

  const recs: RecommendationCandidate[] = [
    {
      title: persona.suggestedActions[0]?.slice(0, 48) ?? "Ask this persona",
      action: "chat:send",
      prompt: primary,
      reason: `Matches ${persona.label}`,
      entitlement: "free",
      personaId,
      weight: 3,
    },
    {
      title: persona.suggestedActions[1]?.slice(0, 48) ?? "Follow-up",
      action: "chat:send",
      prompt: secondary,
      reason: `Continue with ${persona.label}`,
      entitlement: "free",
      personaId,
      weight: 2,
    },
  ];
  if (persona.products.includes("gigalearn")) {
    recs.push({
      ...LEARN_LINK,
      reason: `${persona.label} works well with GigaLearn`,
      weight: 2,
    });
  }
  return recs;
}

export function chatSurfaceCandidates(
  currentPersonaId: string | undefined,
  recentTopics: string[]
): RecommendationCandidate[] {
  if (currentPersonaId && isValidPersonaId(currentPersonaId)) {
    return personaCandidates(currentPersonaId);
  }
  const items: RecommendationCandidate[] = [
    ...CHAT_PERSONA_STARTERS.map((item) => ({ ...item, weight: 2 })),
    { ...LEARN_LINK, weight: 1 },
    { ...STUDIO_CANDIDATE, weight: 1 },
  ];
  if (recentTopics.length > 0) {
    items.unshift({
      title: "Continue recent topic",
      action: "chat:send",
      prompt: `Continue helping me with: ${recentTopics[0]}`,
      reason: "From your recent conversations",
      entitlement: "free",
      weight: 3,
    });
  }
  return items;
}

export function lowCreditCandidate(): RecommendationCandidate {
  return {
    title: "Short explain (1 credit)",
    action: "chat:send",
    prompt: "Explain this in simple bullet points:",
    reason: "Low credits — keep prompts concise",
    entitlement: "free",
    weight: 4,
  };
}
