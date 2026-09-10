import type { RecommendationItem, RecommendationSurface } from "../../../convex/recommendationsLogic";

export type { RecommendationItem, RecommendationSurface };

export const OFFLINE_RECOMMENDATION_FALLBACK: Record<
  RecommendationSurface,
  RecommendationItem[]
> = {
  chat: [
    {
      title: "BECE Tutor",
      action: "persona:bece_tutor",
      prompt: "Help me revise BECE maths with practice questions.",
      reason: "Offline fallback — exam prep",
      entitlement: "free",
      personaId: "bece_tutor",
    },
    {
      title: "Ghana headlines",
      action: "persona:ghana_news_analyst",
      prompt: "Summarize Ghana news when you are back online.",
      reason: "Offline fallback — news persona",
      entitlement: "free",
      personaId: "ghana_news_analyst",
    },
  ],
  learn: [
    {
      title: "GigaLearn practice",
      action: "/gigalearn/",
      prompt: "Open GigaLearn for quizzes and revision.",
      reason: "Offline fallback",
      entitlement: "free",
    },
    {
      title: "BECE Tutor",
      action: "persona:bece_tutor",
      prompt: "Create BECE practice questions.",
      reason: "Offline fallback",
      entitlement: "free",
      personaId: "bece_tutor",
    },
  ],
  social: [
    {
      title: "Open GigaSocial",
      action: "/gigasocial/",
      prompt: "",
      reason: "Offline fallback",
      entitlement: "free",
    },
  ],
  edit: [
    {
      title: "Open GigaEdit",
      action: "/gigaedit/",
      prompt: "",
      reason: "Offline fallback",
      entitlement: "free",
    },
  ],
  studio: [
    {
      title: "Media Studio",
      action: "/media/",
      prompt: "",
      reason: "Offline fallback",
      entitlement: "free",
    },
  ],
  marketplace: [
    {
      title: "Browse marketplace",
      action: "/marketplace/",
      prompt: "",
      reason: "Offline fallback",
      entitlement: "free",
    },
  ],
};

export function offlineRecommendations(
  surface: RecommendationSurface,
  limit = 4
): RecommendationItem[] {
  return OFFLINE_RECOMMENDATION_FALLBACK[surface].slice(0, limit);
}
