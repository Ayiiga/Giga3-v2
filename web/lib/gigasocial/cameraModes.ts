/** Non-destructive capture modes — map to CSS filter presets at publish time. */
import type { CameraFilterId } from "@/lib/gigasocial/cameraFilters";

export type CameraCaptureModeId =
  | "standard"
  | "photo"
  | "video"
  | "cinematic"
  | "night"
  | "portrait"
  | "hdr"
  | "ultra-hdr"
  | "vivid"
  | "natural"
  | "film-look"
  | "pro"
  | "video-4k"
  | "video-8k"
  | "slow-motion"
  | "time-lapse"
  | "beauty"
  | "blur"
  | "lighting"
  | "framing"
  | "stabilize"
  | "color";

export type CameraCaptureMode = {
  id: CameraCaptureModeId;
  label: string;
  description: string;
  filterId?: CameraFilterId;
  group: "capture" | "enhance" | "pro";
  futureReady?: boolean;
};

export const CAMERA_CAPTURE_MODES: CameraCaptureMode[] = [
  { id: "standard", label: "Standard (Auto)", description: "Balanced auto capture", group: "capture" },
  { id: "photo", label: "Photo", description: "Standard still capture", group: "capture" },
  { id: "video", label: "Video", description: "Short-form video up to 40s", group: "capture" },
  { id: "cinematic", label: "Cinematic Video", description: "Film-style color grade", filterId: "cinematic", group: "capture" },
  { id: "night", label: "Night Mode", description: "Low-light enhancement", filterId: "night", group: "capture" },
  { id: "portrait", label: "Portrait Mode", description: "Soft background depth look", filterId: "portrait", group: "capture" },
  { id: "hdr", label: "HDR / Smart HDR", description: "High dynamic range look", filterId: "hdr", group: "capture" },
  { id: "ultra-hdr", label: "Ultra HDR", description: "Expanded highlight and shadow detail", filterId: "hdr", group: "capture" },
  { id: "vivid", label: "Vivid Color", description: "Bold social color grade", filterId: "vivid", group: "capture" },
  { id: "natural", label: "Natural Color", description: "True-to-life tones", filterId: "natural", group: "capture" },
  { id: "film-look", label: "Film Look", description: "Classic film emulation", filterId: "film-look", group: "capture" },
  { id: "pro", label: "Pro Mode", description: "Manual-style controls preset", filterId: "studio", group: "pro" },
  { id: "video-4k", label: "4K Video", description: "High-resolution video capture", filterId: "cinematic", group: "capture" },
  { id: "video-8k", label: "8K Ready", description: "Future-ready ultra-high resolution", filterId: "cinematic", group: "capture", futureReady: true },
  { id: "slow-motion", label: "Slow Motion", description: "Smooth slow-motion feel", filterId: "film-look", group: "capture" },
  { id: "time-lapse", label: "Time-Lapse", description: "Fast-forward energy", filterId: "action-cam", group: "capture" },
  { id: "beauty", label: "AI Beauty", description: "Optional soft skin tone", filterId: "natural", group: "enhance" },
  { id: "blur", label: "AI Blur", description: "Background blur look", filterId: "portrait", group: "enhance" },
  { id: "lighting", label: "AI Lighting", description: "Balanced exposure lift", filterId: "studio", group: "enhance" },
  { id: "framing", label: "AI Framing", description: "Center-weighted crop feel", filterId: "social-creator", group: "enhance" },
  { id: "stabilize", label: "AI Stabilize", description: "Sharper action look", filterId: "action-cam", group: "enhance" },
  { id: "color", label: "AI Color", description: "Vivid social color grade", filterId: "vivid", group: "enhance" },
];

export function getCameraMode(id?: string | null): CameraCaptureMode {
  return CAMERA_CAPTURE_MODES.find((mode) => mode.id === id) ?? CAMERA_CAPTURE_MODES[0];
}
