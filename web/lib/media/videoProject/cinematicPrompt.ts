import type {
  CameraMovementId,
  EnvironmentId,
  LightingStyleId,
  MotionIntensityId,
  VisualStyleId,
  VideoProjectGenerationSettings,
  ConsistencyProfile,
} from "@/lib/media/videoProject/types";

/** Prompt modifiers only — Seedance/fal do not expose discrete camera API fields. */
export const CAMERA_MOVEMENT_PROMPTS: Record<CameraMovementId, string> = {
  cinematic: "cinematic camera movement, smooth professional film motion",
  drone: "aerial drone shot with controlled sweeping movement",
  aerial: "high aerial establishing perspective, gentle forward motion",
  tracking: "tracking shot following subject with stable framing",
  slow_push_in: "slow push-in dolly toward subject, shallow depth of field",
  pull_out: "slow pull-out reveal, expanding context",
  orbit: "orbiting camera around subject, parallax depth",
  crane: "crane shot with vertical lift and gentle pan",
  low_angle: "low-angle hero framing, upward perspective",
  high_angle: "high-angle overview, downward perspective",
  first_person: "first-person POV with natural head motion",
  handheld: "subtle handheld documentary motion, organic shake",
  static: "locked-off static camera, minimal movement",
};

export const LIGHTING_PROMPTS: Record<LightingStyleId, string> = {
  natural: "natural daylight, balanced exposure",
  golden_hour: "warm golden hour sunlight, soft long shadows",
  blue_hour: "blue hour twilight, cool ambient tones",
  studio: "controlled studio lighting, clean key and fill",
  dramatic: "dramatic contrast lighting, motivated shadows",
  soft: "soft diffused lighting, gentle highlights",
  neon: "neon accent lighting, urban night atmosphere",
  overcast: "overcast soft sky, even diffuse light",
};

export const VISUAL_STYLE_PROMPTS: Record<VisualStyleId, string> = {
  cinematic_realism: "cinematic photorealism, film color grade, natural textures",
  documentary: "documentary realism, authentic textures, observational framing",
  futuristic: "futuristic visualization, modern architecture, clean design language",
  warm_natural: "warm natural palette, inviting tones",
  high_contrast: "high contrast grade, crisp detail separation",
  soft_dreamy: "soft dreamy atmosphere, gentle bloom",
};

export const MOTION_INTENSITY_PROMPTS: Record<MotionIntensityId, string> = {
  subtle: "subtle restrained motion, calm pacing",
  moderate: "moderate natural motion, balanced energy",
  dynamic: "dynamic energetic motion, active camera and subject movement",
};

export const ENVIRONMENT_PROMPTS: Record<EnvironmentId, string> = {
  urban: "urban city environment with believable street life",
  rural: "rural landscape with open space and natural ground",
  coastal: "coastal environment with horizon and open air",
  forest: "forest or green vegetation environment",
  indoor: "interior environment with practical lighting",
  studio: "clean studio or controlled set environment",
  mixed: "mixed environment transitions with coherent geography",
};

export type ProviderVideoCapabilities = {
  aspects: Array<"16:9" | "9:16" | "1:1">;
  durationsSec: number[];
  resolutions: Array<"720p" | "1080p">;
  syncedAudio: boolean;
  /** Camera/lighting are prompt-steered, not API parameters. */
  promptSteeredControls: true;
};

/** Mirrors Media Studio + fal Seedance limits exposed in the UI today. */
export const MEDIA_STUDIO_VIDEO_CAPABILITIES: ProviderVideoCapabilities = {
  aspects: ["16:9", "9:16", "1:1"],
  durationsSec: [5, 10, 15],
  resolutions: ["720p", "1080p"],
  syncedAudio: true,
  promptSteeredControls: true,
};

export function buildSceneGenerationPrompt(
  scenePrompt: string,
  settings: VideoProjectGenerationSettings,
  consistency: ConsistencyProfile,
  sceneCamera?: CameraMovementId
): string {
  const camera = sceneCamera ?? settings.cameraMovement;
  const parts = [
    scenePrompt.trim(),
    VISUAL_STYLE_PROMPTS[settings.visualStyle],
    CAMERA_MOVEMENT_PROMPTS[camera],
    LIGHTING_PROMPTS[settings.lighting],
    MOTION_INTENSITY_PROMPTS[settings.motionIntensity],
    ENVIRONMENT_PROMPTS[settings.environment],
  ];

  if (consistency.mainCharacter?.description.trim()) {
    parts.push(`Main character consistency: ${consistency.mainCharacter.description.trim()}`);
  }
  if (consistency.locations[0]?.description.trim()) {
    parts.push(`Location consistency: ${consistency.locations[0].description.trim()}`);
  }

  if (settings.avoidInSceneText) {
    parts.push(
      "Do not render readable text, logos, or UI typography in the video frame — keep screens and signs abstract or out of focus. Any titles belong in post-production overlays."
    );
  }

  parts.push(
    "Maintain object and subject consistency with prior scenes. Smooth motion, coherent lighting, realistic depth and perspective."
  );

  return parts.filter(Boolean).join(". ");
}

export function applyRegenerationModeToSettings(
  settings: VideoProjectGenerationSettings,
  mode: import("@/lib/media/videoProject/types").SceneRegenerationMode
): VideoProjectGenerationSettings {
  switch (mode) {
    case "improve_quality":
      return { ...settings, resolution: "1080p", motionIntensity: "subtle" };
    case "change_camera":
      return {
        ...settings,
        cameraMovement: settings.cameraMovement === "static" ? "cinematic" : "slow_push_in",
      };
    case "change_lighting":
      return {
        ...settings,
        lighting: settings.lighting === "golden_hour" ? "dramatic" : "golden_hour",
      };
    case "change_environment":
      return {
        ...settings,
        environment: settings.environment === "urban" ? "mixed" : "urban",
      };
    case "change_style":
      return {
        ...settings,
        visualStyle:
          settings.visualStyle === "cinematic_realism" ? "futuristic" : "cinematic_realism",
      };
    default:
      return settings;
  }
}
