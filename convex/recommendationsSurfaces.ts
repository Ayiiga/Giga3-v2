import {
  chatSurfaceCandidates,
  LEARN_LINK,
  STUDIO_CANDIDATE,
  type RecommendationCandidate,
  type RecommendationSurface,
} from "./recommendationsCatalog";

export function surfaceDefaults(surface: RecommendationSurface): RecommendationCandidate[] {
  switch (surface) {
    case "learn":
      return [
        { ...LEARN_LINK, weight: 3 },
        {
          title: "BECE Tutor in Chat",
          action: "persona:bece_tutor",
          prompt: "Create BECE practice questions for my weak topics.",
          reason: "Exam-focused tutoring",
          entitlement: "free",
          personaId: "bece_tutor",
          weight: 2,
        },
        {
          title: "WASSCE Tutor in Chat",
          action: "persona:wassce_tutor",
          prompt: "Build a WASSCE revision plan for this week.",
          reason: "SHS exam preparation",
          entitlement: "free",
          personaId: "wassce_tutor",
          weight: 2,
        },
        { ...STUDIO_CANDIDATE, weight: 1 },
      ];
    case "social":
      return [
        {
          title: "Caption ideas",
          action: "persona:social_media_manager",
          prompt: "Write 3 Instagram captions for my brand launch.",
          reason: "Creator-focused persona",
          entitlement: "free",
          personaId: "social_media_manager",
          weight: 2,
        },
        {
          title: "Open GigaSocial",
          action: "/gigasocial/",
          prompt: "",
          reason: "Share and discover",
          entitlement: "free",
          weight: 2,
        },
      ];
    case "edit":
      return [
        {
          title: "Open GigaEdit",
          action: "/gigaedit/",
          prompt: "",
          reason: "Timeline editing",
          entitlement: "free",
          weight: 3,
        },
        {
          title: "Video script",
          action: "persona:video_producer",
          prompt: "Write a short promo video script with scenes.",
          reason: "Plan before you edit",
          entitlement: "free",
          personaId: "video_producer",
          weight: 2,
        },
      ];
    case "studio":
      return [{ ...STUDIO_CANDIDATE, weight: 3 }, { ...LEARN_LINK, weight: 1 }];
    case "marketplace":
      return [
        {
          title: "List a template",
          action: "/marketplace/sell/",
          prompt: "",
          reason: "Sell digital products",
          entitlement: "free",
          requiredFeature: "marketplace_listing",
          freeAlternative: {
            title: "Browse marketplace",
            action: "/marketplace/",
            prompt: "",
            reason: "Discover templates",
            entitlement: "free",
          },
          weight: 2,
        },
      ];
    default:
      return chatSurfaceCandidates(undefined, []);
  }
}
