import type { MediaVideoDurationSec } from "@/lib/media/videoLimits";
import {
  newSceneId,
  type CameraMovementId,
  type DirectorPlanScene,
  type DirectorProductionPlan,
  type LocationRef,
  type VideoAspect,
  type VideoProject,
  type VideoScene,
  type VisualStyleId,
} from "@/lib/media/videoProject/types";
import { buildLocationPromptContext, parseLocationFromPrompt } from "@/lib/media/videoProject/locationContext";
import { VISUAL_STYLE_PROMPTS } from "@/lib/media/videoProject/cinematicPrompt";

export type BuildDirectorPlanInput = {
  /** User's core idea — stored verbatim, never rewritten by the planner. */
  sourceIdea: string;
  preferredFormat?: VideoAspect;
  sceneDurationSec?: MediaVideoDurationSec;
};

const CAMERA_LABELS: Record<CameraMovementId, string> = {
  cinematic: "cinematic",
  drone: "drone",
  aerial: "aerial slow push",
  tracking: "tracking shot",
  slow_push_in: "slow push-in",
  pull_out: "cinematic pull-out",
  orbit: "orbit",
  crane: "crane shot",
  low_angle: "low-angle",
  high_angle: "high-angle",
  first_person: "first-person",
  handheld: "handheld",
  static: "static",
};

type SceneTemplate = {
  slug: string;
  title: string;
  cameraMovement: CameraMovementId;
  cameraLabel: string;
  description: string;
};

const FUTURE_CITY_SCENE_TEMPLATES: SceneTemplate[] = [
  {
    slug: "ESTABLISHING SHOT",
    title: "Establishing shot",
    cameraMovement: "aerial",
    cameraLabel: "aerial slow push",
    description: "futuristic skyline establishing view",
  },
  {
    slug: "SMART TRANSPORT",
    title: "Smart transport",
    cameraMovement: "tracking",
    cameraLabel: "tracking shot",
    description: "futuristic public transportation in motion",
  },
  {
    slug: "CITY LIFE",
    title: "City life",
    cameraMovement: "tracking",
    cameraLabel: "street-level tracking",
    description: "people moving through a modern Ghanaian city",
  },
  {
    slug: "TECHNOLOGY",
    title: "Technology",
    cameraMovement: "crane",
    cameraLabel: "crane shot",
    description: "smart buildings and digital infrastructure",
  },
  {
    slug: "CLOSING",
    title: "Closing",
    cameraMovement: "pull_out",
    cameraLabel: "cinematic pull-out",
    description: "sunset over the futuristic city",
  },
];

function isFutureCityIdea(idea: string): boolean {
  return (
    /\b(2050|2060|future|futuristic|smart city|tomorrow|might look like)\b/i.test(idea) &&
    /\b(city|accra|ghana|africa|skyline)\b/i.test(idea)
  );
}

function inferFormat(idea: string, preferred?: VideoAspect): VideoAspect {
  if (preferred) return preferred;
  if (/\b(9:16|vertical|tiktok|reels|shorts|portrait)\b/i.test(idea)) return "9:16";
  if (/\b(1:1|square)\b/i.test(idea)) return "1:1";
  if (/\b(16:9|landscape|youtube)\b/i.test(idea)) return "16:9";
  return isFutureCityIdea(idea) ? "9:16" : "16:9";
}

function inferVisualStyle(idea: string): { id: VisualStyleId; label: string } {
  if (/\b(futuristic|2050|2060|smart city|tomorrow)\b/i.test(idea)) {
    return { id: "futuristic", label: "Cinematic futuristic realism" };
  }
  if (/\b(documentary|real life|news)\b/i.test(idea)) {
    return { id: "documentary", label: "Documentary realism" };
  }
  return { id: "cinematic_realism", label: "Cinematic realism" };
}

/** Build a display title from the user's idea without replacing their words. */
export function deriveDirectorTitle(sourceIdea: string, location: LocationRef | null): string {
  const trimmed = sourceIdea.trim();
  if (!trimmed) return "Untitled production";

  const ghana2050 = trimmed.match(/ghana\s+in\s+2050/i);
  if (ghana2050 && location?.city?.toLowerCase() === "accra") {
    return "Ghana in 2050 — Accra";
  }
  if (location?.city && location?.country) {
    const cityTitle = location.city;
    const countryTitle = location.country;
    if (trimmed.toLowerCase().includes(cityTitle.toLowerCase())) {
      return trimmed.length <= 80 ? trimmed : `${countryTitle} — ${cityTitle}`;
    }
    return `${countryTitle} — ${cityTitle}`;
  }

  const firstSentence = trimmed.split(/[.!?\n]/)[0]?.trim() ?? trimmed;
  return firstSentence.length <= 80 ? firstSentence : `${firstSentence.slice(0, 77)}…`;
}

function locationDetailForScene(
  template: SceneTemplate,
  location: LocationRef | null,
  cityWord: string | null
): string {
  let desc = template.description;
  if (cityWord && /skyline|city|sunset|transport|buildings/i.test(desc)) {
    desc = desc.replace(/\bthe futuristic city\b/i, `futuristic ${cityWord}`);
    desc = desc.replace(/\bfuturistic skyline\b/i, `futuristic ${cityWord} skyline`);
    if (/sunset/i.test(desc) && cityWord) {
      desc = desc.replace(/sunset over the futuristic city/i, `sunset over futuristic ${cityWord}`);
    }
  }
  if (location?.city?.toLowerCase() === "accra" && /Ghanaian city/i.test(desc)) {
    return desc;
  }
  return desc;
}

export function buildDirectorPlanFromIdea(input: BuildDirectorPlanInput): DirectorProductionPlan {
  const sourceIdea = input.sourceIdea.trim();
  const sceneDuration = input.sceneDurationSec ?? 5;
  const location = parseLocationFromPrompt(sourceIdea);
  const cityWord = location?.city ?? null;
  const format = inferFormat(sourceIdea, input.preferredFormat);
  const visual = inferVisualStyle(sourceIdea);
  const title = deriveDirectorTitle(sourceIdea, location);

  let templates = FUTURE_CITY_SCENE_TEMPLATES;
  if (!isFutureCityIdea(sourceIdea)) {
    templates = [
      {
        slug: "OPENING",
        title: "Opening",
        cameraMovement: "cinematic",
        cameraLabel: CAMERA_LABELS.cinematic,
        description: "establish the scene from the user's idea",
      },
      {
        slug: "MIDDLE",
        title: "Development",
        cameraMovement: "tracking",
        cameraLabel: CAMERA_LABELS.tracking,
        description: "expand on the core concept with natural motion",
      },
      {
        slug: "CLOSING",
        title: "Closing",
        cameraMovement: "pull_out",
        cameraLabel: CAMERA_LABELS.pull_out,
        description: "concluding shot that reflects the user's idea",
      },
    ];
  }

  const scenes: DirectorPlanScene[] = templates.map((template, order) => ({
    id: newSceneId(),
    order,
    slug: template.slug,
    title: template.title,
    durationSec: sceneDuration,
    cameraMovement: template.cameraMovement,
    cameraLabel: template.cameraLabel,
    description: locationDetailForScene(template, location, cityWord),
  }));

  if (location?.city?.toLowerCase() === "accra" && isFutureCityIdea(sourceIdea)) {
    scenes[0].description = "futuristic Accra skyline";
    scenes[4].description = "sunset over futuristic Accra";
  }

  return {
    title,
    format,
    totalDurationSec: scenes.length * sceneDuration,
    visualStyle: visual.id,
    visualStyleLabel: visual.label,
    scenes,
  };
}

/** Scene prompt always anchors to the user's original idea. */
export function buildDirectorScenePrompt(sourceIdea: string, scene: DirectorPlanScene): string {
  const location = parseLocationFromPrompt(sourceIdea);
  const locationCtx = location ? buildLocationPromptContext(location) : "";
  return [
    `Creative visualization based on the user's concept: "${sourceIdea}".`,
    `${scene.title}: ${scene.description}.`,
    `Camera: ${scene.cameraLabel}.`,
    locationCtx,
    "AI-generated visualization — not verified documentary footage.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function directorPlanToVideoScenes(
  sourceIdea: string,
  plan: DirectorProductionPlan,
  existingScenes: VideoScene[] = []
): VideoScene[] {
  const existingByOrder = new Map(existingScenes.map((s) => [s.order, s]));

  return plan.scenes.map((row) => {
    const prev = existingByOrder.get(row.order);
    return {
      id: prev?.id ?? row.id ?? newSceneId(),
      order: row.order,
      title: row.title,
      description: row.description,
      durationSec: row.durationSec,
      cameraMovement: row.cameraMovement,
      prompt: buildDirectorScenePrompt(sourceIdea, row),
      locked: prev?.locked ?? false,
      status: prev?.status ?? "idle",
      outputUrl: prev?.outputUrl,
      previousOutputUrl: prev?.previousOutputUrl,
      jobId: prev?.jobId,
      creditsCharged: prev?.creditsCharged,
      errorMessage: prev?.errorMessage,
      generationNonce: prev?.generationNonce,
    } as VideoScene;
  });
}

export function applyDirectorPlanToProject(
  project: VideoProject,
  plan: DirectorProductionPlan
): VideoProject {
  return {
    ...project,
    sourceIdea: project.sourceIdea,
    directorMode: true,
    directorPlan: plan,
    title: plan.title,
    masterPrompt: project.sourceIdea,
    settings: {
      ...project.settings,
      aspectRatio: plan.format,
      durationSec: plan.scenes[0]?.durationSec ?? project.settings.durationSec,
      visualStyle: plan.visualStyle,
    },
    consistency: {
      ...project.consistency,
      projectTitle: plan.title,
      visualStyle: plan.visualStyle,
    },
    scenes: directorPlanToVideoScenes(project.sourceIdea, plan, project.scenes),
    status: "draft",
    updatedAt: Date.now(),
  };
}

export function updateDirectorPlanScene(
  plan: DirectorProductionPlan,
  sceneId: string,
  patch: Partial<DirectorPlanScene>
): DirectorProductionPlan {
  const scenes = plan.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s));
  const totalDurationSec = scenes.reduce((sum, s) => sum + s.durationSec, 0);
  return { ...plan, scenes, totalDurationSec };
}

export function syncProjectFromDirectorPlan(project: VideoProject): VideoProject {
  if (!project.directorPlan) return project;
  return {
    ...applyDirectorPlanToProject(project, project.directorPlan),
    scenes: directorPlanToVideoScenes(
      project.sourceIdea,
      project.directorPlan,
      project.scenes
    ),
  };
}

export function formatDirectorPlanSummary(plan: DirectorProductionPlan): string {
  const sceneLines = plan.scenes
    .map(
      (s, i) =>
        `${String(i + 1).padStart(2, "0")} — ${s.slug}\nDuration: ${s.durationSec} sec\nCamera: ${s.cameraLabel}\nDescription: ${s.description}`
    )
    .join("\n\n");
  return [
    `TITLE:\n${plan.title}`,
    `FORMAT:\n${plan.format}`,
    `DURATION:\n${plan.totalDurationSec} seconds`,
    `VISUAL STYLE:\n${plan.visualStyleLabel}`,
    `SCENES:\n\n${sceneLines}`,
  ].join("\n\n");
}

export function estimateDirectorPlanCredits(
  plan: DirectorProductionPlan,
  costForDuration: (sec: MediaVideoDurationSec) => number
): number {
  return plan.scenes.reduce((sum, scene) => sum + costForDuration(scene.durationSec), 0);
}
