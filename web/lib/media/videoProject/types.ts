import type { MediaVideoDurationSec } from "@/lib/media/videoLimits";
import type { VideoAspect, VideoQuality } from "@/components/media/VideoGenerateForm";

/** Project lifecycle — extends flat mediaJobs with multi-scene workflow state. */
export type VideoProjectStatus =
  | "draft"
  | "generating"
  | "processing"
  | "ready"
  | "needs_review"
  | "exporting"
  | "completed"
  | "failed";

export type CameraMovementId =
  | "cinematic"
  | "drone"
  | "aerial"
  | "tracking"
  | "slow_push_in"
  | "pull_out"
  | "orbit"
  | "crane"
  | "low_angle"
  | "high_angle"
  | "first_person"
  | "handheld"
  | "static";

export type LightingStyleId =
  | "natural"
  | "golden_hour"
  | "blue_hour"
  | "studio"
  | "dramatic"
  | "soft"
  | "neon"
  | "overcast";

export type VisualStyleId =
  | "cinematic_realism"
  | "documentary"
  | "futuristic"
  | "warm_natural"
  | "high_contrast"
  | "soft_dreamy";

export type MotionIntensityId = "subtle" | "moderate" | "dynamic";

export type EnvironmentId =
  | "urban"
  | "rural"
  | "coastal"
  | "forest"
  | "indoor"
  | "studio"
  | "mixed";

export type VideoProjectGenerationSettings = {
  aspectRatio: VideoAspect;
  durationSec: MediaVideoDurationSec;
  resolution: VideoQuality;
  generateAudio: boolean;
  cameraMovement: CameraMovementId;
  lighting: LightingStyleId;
  visualStyle: VisualStyleId;
  motionIntensity: MotionIntensityId;
  environment: EnvironmentId;
  /** When true, steer prompts away from readable in-scene AI text (overlays handle text). */
  avoidInSceneText: boolean;
};

export type LocationRef = {
  country?: string;
  region?: string;
  city?: string;
  environmentNote?: string;
};

export type ConsistencyCharacterRef = {
  id: string;
  label: string;
  description: string;
  role: "main" | "supporting";
};

export type ConsistencyLocationRef = {
  id: string;
  label: string;
  description: string;
};

export type ConsistencyProfile = {
  projectTitle: string;
  visualStyle: VisualStyleId;
  timeOfDay: LightingStyleId;
  location: LocationRef;
  mainCharacter?: ConsistencyCharacterRef;
  supportingCharacters: ConsistencyCharacterRef[];
  locations: ConsistencyLocationRef[];
  objects: Array<{ id: string; label: string; description: string }>;
  /** Shown on export when user opts in — fictional visualization label. */
  aiVisualizationLabel: boolean;
};

export type TextOverlayKind =
  | "title"
  | "subtitle"
  | "caption"
  | "billboard"
  | "sign"
  | "logo"
  | "watermark"
  | "lower_third"
  | "cta";

export type TextOverlayAnimation = "none" | "fade_in" | "slide_up" | "typewriter";

export type TextOverlayLayer = {
  id: string;
  kind: TextOverlayKind;
  /** User text — preserved exactly; never AI-rewritten. */
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 400 | 600 | 700;
  align: "left" | "center" | "right";
  position: "top" | "center" | "bottom" | "lower_third";
  animation: TextOverlayAnimation;
  shadow: boolean;
  outline: boolean;
  background: boolean;
  opacity: number;
  letterSpacing: number;
  /** Optional scene scope — undefined = project-wide. */
  sceneId?: string;
  locked: boolean;
};

export type SceneGenerationState =
  | "idle"
  | "queued"
  | "generating"
  | "succeeded"
  | "failed";

export type SceneRegenerationMode =
  | "same_prompt"
  | "improve_quality"
  | "change_camera"
  | "change_lighting"
  | "change_environment"
  | "change_style"
  | "edit_prompt";

export type VideoScene = {
  id: string;
  order: number;
  title: string;
  prompt: string;
  locked: boolean;
  status: SceneGenerationState;
  jobId?: string;
  outputUrl?: string;
  /** Previous output kept for compare (regenerate flow). */
  previousOutputUrl?: string;
  creditsCharged?: number;
  errorMessage?: string;
  /** Client idempotency — prevents double charge on retry UI glitches. */
  generationNonce?: string;
};

export type VideoProject = {
  id: string;
  title: string;
  status: VideoProjectStatus;
  createdAt: number;
  updatedAt: number;
  masterPrompt: string;
  settings: VideoProjectGenerationSettings;
  consistency: ConsistencyProfile;
  scenes: VideoScene[];
  textOverlays: TextOverlayLayer[];
  /** GigaEdit handoff metadata */
  gigaEditProjectId?: string;
  lastQualityCheckAt?: number;
  lastQualityCheckReady?: boolean;
};

export const DEFAULT_GENERATION_SETTINGS: VideoProjectGenerationSettings = {
  aspectRatio: "16:9",
  durationSec: 10,
  resolution: "720p",
  generateAudio: true,
  cameraMovement: "cinematic",
  lighting: "golden_hour",
  visualStyle: "cinematic_realism",
  motionIntensity: "moderate",
  environment: "urban",
  avoidInSceneText: true,
};

export function createDefaultConsistencyProfile(title: string): ConsistencyProfile {
  return {
    projectTitle: title,
    visualStyle: "cinematic_realism",
    timeOfDay: "golden_hour",
    location: {},
    supportingCharacters: [],
    locations: [],
    objects: [],
    aiVisualizationLabel: true,
  };
}

export function newProjectId(): string {
  return `mvp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newSceneId(): string {
  return `sc_${Math.random().toString(36).slice(2, 11)}`;
}

export function newOverlayId(): string {
  return `tx_${Math.random().toString(36).slice(2, 11)}`;
}
