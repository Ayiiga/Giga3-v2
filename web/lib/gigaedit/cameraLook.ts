/**
 * Professional camera-style look pipeline for GigaEdit previews.
 * Non-destructive: CSS / constraint helpers only — never mutates original media.
 */

import { getCameraFilterCss } from "@/lib/gigasocial/cameraFilters";
import { supportsHdrDisplay, type DeviceTier } from "@/lib/gigaedit/deviceCapability";

export type WhiteBalancePreset = "auto" | "daylight" | "cloudy" | "tungsten" | "fluorescent";

export type CameraLookOptions = {
  adaptiveBrightness: boolean;
  hdr: boolean;
  autoExposure: boolean;
  autofocus: boolean;
  whiteBalance: WhiteBalancePreset;
  stabilization: boolean;
  portrait: boolean;
  lowLight: boolean;
  naturalColors: boolean;
};

export type FrameAnalysis = {
  /** 0–1 average luminance */
  luminance: number;
  /** Rough warm/cool bias (−1 cool … +1 warm) */
  warmth: number;
  sampledAt: number;
};

export const DEFAULT_CAMERA_LOOK: CameraLookOptions = {
  adaptiveBrightness: true,
  hdr: true,
  autoExposure: true,
  autofocus: true,
  whiteBalance: "auto",
  stabilization: true,
  portrait: false,
  lowLight: true,
  naturalColors: true,
};

/** Teleprompter / talking-head preset — max clarity, HDR-style lift, no portrait softening. */
export const ULTRA_CLEAR_CAMERA_LOOK: CameraLookOptions = {
  adaptiveBrightness: true,
  hdr: true,
  autoExposure: true,
  autofocus: true,
  whiteBalance: "daylight",
  stabilization: true,
  portrait: false,
  lowLight: true,
  naturalColors: false,
};

const WB_CSS: Record<Exclude<WhiteBalancePreset, "auto">, string> = {
  daylight: "sepia(0.04) hue-rotate(-2deg) saturate(1.02)",
  cloudy: "sepia(0.08) hue-rotate(8deg) brightness(1.03)",
  tungsten: "sepia(0.06) hue-rotate(-18deg) saturate(0.96)",
  fluorescent: "hue-rotate(12deg) saturate(0.94) brightness(1.02)",
};

/** Sample average luminance + warmth from ImageData (sparse grid for speed). */
export function analyzeImageData(data: ImageData, step = 12): FrameAnalysis {
  const { data: px, width, height } = data;
  let sumY = 0;
  let sumR = 0;
  let sumB = 0;
  let count = 0;
  const stride = Math.max(4, step * 4);
  for (let y = 0; y < height; y += step) {
    const row = y * width * 4;
    for (let x = 0; x < width * 4; x += stride) {
      const i = row + x;
      if (i + 2 >= px.length) continue;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      // Rec. 709 luma
      sumY += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sumR += r;
      sumB += b;
      count += 1;
    }
  }
  if (count === 0) {
    return { luminance: 0.5, warmth: 0, sampledAt: Date.now() };
  }
  const luminance = Math.min(1, Math.max(0, sumY / count / 255));
  const avgR = sumR / count;
  const avgB = sumB / count;
  const warmth = Math.max(-1, Math.min(1, (avgR - avgB) / 128));
  return { luminance, warmth, sampledAt: Date.now() };
}

export function emptyFrameAnalysis(): FrameAnalysis {
  return { luminance: 0.5, warmth: 0, sampledAt: 0 };
}

function exposureCompensation(luminance: number, enabled: boolean): number {
  if (!enabled) return 1;
  // Target ~0.48 mid-grey; gently lift shadows / pull highlights.
  const delta = 0.48 - luminance;
  return Math.min(1.28, Math.max(0.78, 1 + delta * 0.55));
}

function adaptiveBrightnessFactor(luminance: number, enabled: boolean): number {
  if (!enabled) return 1;
  if (luminance < 0.22) return 1.12;
  if (luminance > 0.78) return 0.94;
  return 1 + (0.5 - luminance) * 0.12;
}

function autoWhiteBalanceCss(warmth: number, preset: WhiteBalancePreset): string {
  if (preset !== "auto") return WB_CSS[preset];
  if (warmth > 0.18) return "hue-rotate(-6deg) saturate(0.98)";
  if (warmth < -0.18) return "hue-rotate(8deg) saturate(1.02)";
  return "saturate(1.01)";
}

/**
 * Compose a CSS filter string for camera-style preview.
 * `baseFilterId` may reference CAMERA_FILTERS; extras stack after.
 */
export function composeCameraLookCss(opts: {
  look: CameraLookOptions;
  analysis?: FrameAnalysis | null;
  baseFilterId?: string | null;
  baseFilterCss?: string | null;
  tier?: DeviceTier;
  /** Extra lift for teleprompter Ultra Clear mode. */
  ultraClear?: boolean;
}): string {
  const { look, analysis, baseFilterId, tier = "mid", ultraClear = false } = opts;
  const base =
    opts.baseFilterCss ??
    (baseFilterId ? getCameraFilterCss(baseFilterId) : undefined) ??
    "none";

  const parts: string[] = [];
  if (base && base !== "none") parts.push(base);

  const lum = analysis?.luminance ?? 0.5;
  const warmth = analysis?.warmth ?? 0;

  const bright = adaptiveBrightnessFactor(lum, look.adaptiveBrightness);
  const exposure = exposureCompensation(lum, look.autoExposure);
  parts.push(`brightness(${(bright * exposure).toFixed(3)})`);

  if (look.hdr && (supportsHdrDisplay() || tier !== "low")) {
    // Soft HDR: lift local contrast without crushing natural color.
    parts.push("contrast(1.12) saturate(1.08)");
  } else if (look.naturalColors) {
    parts.push("contrast(1.03) saturate(1.02)");
  }

  if (look.lowLight && lum < 0.28) {
    parts.push("brightness(1.08) contrast(1.1) saturate(1.06)");
  }

  if (look.portrait) {
    parts.push("brightness(1.04) contrast(0.98) saturate(1.05)");
  }

  if (look.autofocus && tier !== "low") {
    // Subtle clarity — avoid blur on low-end (GPU cost).
    parts.push("contrast(1.04)");
  }

  parts.push(autoWhiteBalanceCss(warmth, look.whiteBalance));

  if (look.naturalColors) {
    // Pull oversaturated HDR stacks back toward natural skin/sky.
    parts.push("saturate(0.97)");
  }

  if (ultraClear) {
    parts.push("brightness(1.06) contrast(1.14) saturate(1.1)");
  }

  return parts.filter(Boolean).join(" ") || "none";
}

export function cameraLookTransformCss(look: CameraLookOptions, tier: DeviceTier): string {
  if (!look.stabilization || tier === "low") return "none";
  // Optical-style micro-stabilize: slight scale avoids edge shake feel without animation.
  return "scale(1.02)";
}

/** MediaTrack constraints for live camera (teleprompter / capture). */
export function buildProCameraConstraints(opts?: {
  facingMode?: "user" | "environment";
  look?: Partial<CameraLookOptions>;
  tier?: DeviceTier;
}): MediaStreamConstraints {
  const look = { ...DEFAULT_CAMERA_LOOK, ...opts?.look };
  const tier = opts?.tier ?? "mid";
  const facingMode = opts?.facingMode ?? "user";

  const widthIdeal = tier === "low" ? 720 : tier === "high" ? 1920 : 1280;
  const heightIdeal = tier === "low" ? 1280 : tier === "high" ? 1080 : 720;

  const video: MediaTrackConstraints = {
    facingMode,
    width: { ideal: widthIdeal },
    height: { ideal: heightIdeal },
    frameRate: { ideal: tier === "low" ? 24 : 30, max: tier === "high" ? 60 : 30 },
  };

  // Advanced constraint keys are optional; browsers ignore unknowns.
  const advanced: Record<string, unknown>[] = [];
  if (look.autofocus) advanced.push({ focusMode: "continuous" });
  if (look.autoExposure) advanced.push({ exposureMode: "continuous" });
  if (look.whiteBalance === "auto") advanced.push({ whiteBalanceMode: "continuous" });
  if (look.stabilization) {
    advanced.push({ resizeMode: "none" });
    (video as MediaTrackConstraints & { resizeMode?: string }).resizeMode = "none";
  }
  if (advanced.length) {
    (video as MediaTrackConstraints & { advanced?: Record<string, unknown>[] }).advanced =
      advanced;
  }

  return { video, audio: true };
}

/** Apply supported track constraints after stream start (best-effort). */
export async function applyCameraTrackEnhancements(
  stream: MediaStream,
  look: CameraLookOptions = DEFAULT_CAMERA_LOOK
): Promise<string[]> {
  const applied: string[] = [];
  const track = stream.getVideoTracks()[0];
  if (!track || typeof track.applyConstraints !== "function") return applied;

  const tryApply = async (partial: MediaTrackConstraints, label: string) => {
    try {
      await track.applyConstraints(partial);
      applied.push(label);
    } catch {
      /* unsupported */
    }
  };

  if (look.autofocus) {
    await tryApply(
      { advanced: [{ focusMode: "continuous" }] } as MediaTrackConstraints,
      "autofocus"
    );
  }
  if (look.autoExposure) {
    await tryApply(
      { advanced: [{ exposureMode: "continuous" }] } as MediaTrackConstraints,
      "auto-exposure"
    );
  }
  if (look.whiteBalance === "auto") {
    await tryApply(
      { advanced: [{ whiteBalanceMode: "continuous" }] } as MediaTrackConstraints,
      "white-balance"
    );
  }
  if (look.stabilization) {
    await tryApply(
      {
        advanced: [{ resizeMode: "none" }],
      } as MediaTrackConstraints,
      "stabilization"
    );
  }
  return applied;
}

export function describeCameraLook(look: CameraLookOptions, analysis?: FrameAnalysis | null): string {
  const bits: string[] = [];
  if (look.adaptiveBrightness) bits.push("Adaptive brightness");
  if (look.hdr) bits.push(supportsHdrDisplay() ? "HDR" : "HDR-style");
  if (look.autoExposure) bits.push("Auto exposure");
  if (look.autofocus) bits.push("Autofocus clarity");
  if (look.whiteBalance !== "auto") bits.push(`WB ${look.whiteBalance}`);
  else bits.push("Auto WB");
  if (look.stabilization) bits.push("Stabilization");
  if (look.portrait) bits.push("Portrait");
  if (look.lowLight && (analysis?.luminance ?? 1) < 0.28) bits.push("Low-light");
  if (look.naturalColors) bits.push("Natural color");
  return bits.join(" · ");
}
