/**
 * Learning Studios directory for Academy Phase 1 landing.
 * Deep-links only to existing experiences; others stay planned.
 */

export type LearningStudioStatus = "available" | "planned";

export type LearningStudioDefinition = {
  id: string;
  name: string;
  blurb: string;
  status: LearningStudioStatus;
  /** Present only when status is available and destination exists. */
  href?: string;
  ctaLabel?: string;
};

/**
 * Studio destinations verified against current GigaLearn routes/hubs.
 * Do not invent tools or routes here.
 */
export const LEARNING_STUDIOS: LearningStudioDefinition[] = [
  {
    id: "giga-ai",
    name: "GigaAI Studio",
    blurb: "Ask, explain, and practise with the existing GigaLearn AI Tutor.",
    status: "available",
    href: "/gigalearn/?tab=tutor",
    ctaLabel: "Open AI Tutor",
  },
  {
    id: "giga-web",
    name: "GigaWeb Studio",
    blurb: "Build web projects with guided challenges — studio workspace not shipped yet.",
    status: "planned",
  },
  {
    id: "giga-pwa",
    name: "GigaPWA Studio",
    blurb: "Learn progressive web apps by shipping installable experiences — planned.",
    status: "planned",
  },
  {
    id: "giga-app",
    name: "GigaApp Studio",
    blurb: "App-building lab for mobile-first projects — planned.",
    status: "planned",
  },
  {
    id: "giga-coding",
    name: "GigaCoding Studio",
    blurb: "Computing practice through the existing Student Learn hub (Computing subject).",
    status: "available",
    href: "/gigalearn/?tab=learn",
    ctaLabel: "Open Student Learn",
  },
  {
    id: "giga-robotics",
    name: "GigaRobotics Studio",
    blurb: "Robotics and physical computing pathways — planned.",
    status: "planned",
  },
  {
    id: "giga-innovation",
    name: "GigaInnovation Studio",
    blurb: "Create lessons, quizzes, and materials with the existing Create hub.",
    status: "available",
    href: "/gigalearn/?tab=create",
    ctaLabel: "Open Create",
  },
];

export const ACADEMY_TRANSFORM_TAGLINE =
  "Learn by Doing. Build with AI. Create the Future.";
