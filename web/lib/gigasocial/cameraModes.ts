/** Non-destructive capture modes — map to CSS filter presets at publish time. */
import type { CameraFilterId } from "@/lib/gigasocial/cameraFilters";

export type CameraCaptureModeId =
  | "photo"
  | "video"
  | "portrait"
  | "hdr"
  | "night"
  | "cinematic"
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
  group: "capture" | "enhance";
};

export const CAMERA_CAPTURE_MODES: CameraCaptureMode[] = [
  { id: "photo", label: "Photo", description: "Standard still capture", group: "capture" },
  { id: "video", label: "Video", description: "Short-form video up to 40s", group: "capture" },
  { id: "portrait", label: "Portrait", description: "Soft background depth look", filterId: "portrait", group: "capture" },
  { id: "hdr", label: "HDR", description: "High dynamic range look", filterId: "hdr", group: "capture" },
  { id: "night", label: "Night", description: "Low-light enhancement", filterId: "night", group: "capture" },
  { id: "cinematic", label: "Cinematic", description: "Film-style color grade", filterId: "cinematic", group: "capture" },
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
