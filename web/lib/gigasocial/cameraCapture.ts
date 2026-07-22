/** Camera + MediaRecorder helpers for GigaSocial capture studio. */

export type CameraFacing = "user" | "environment";

/** Capture quality presets applied as getUserMedia constraints. */
export type CameraQualityId = "hd" | "full-hd" | "ultra-hd";

export type CameraQualityPreset = {
  id: CameraQualityId;
  label: string;
  description: string;
  width: number;
  height: number;
  frameRate?: number;
};

export const CAMERA_QUALITY_PRESETS: CameraQualityPreset[] = [
  {
    id: "hd",
    label: "HD 720p",
    description: "Faster on slow networks",
    width: 1280,
    height: 720,
    frameRate: 30,
  },
  {
    id: "full-hd",
    label: "Full HD 1080p",
    description: "Sharp social default",
    width: 1920,
    height: 1080,
    frameRate: 30,
  },
  {
    id: "ultra-hd",
    label: "4K Ultra HD",
    description: "Highest quality when supported",
    width: 3840,
    height: 2160,
    frameRate: 30,
  },
];

export type CameraDeviceOption = {
  deviceId: string;
  label: string;
};

export type CameraStreamRequest = {
  facing?: CameraFacing;
  includeAudio?: boolean;
  quality?: CameraQualityId;
  deviceId?: string;
};

let primedStreamPromise: Promise<MediaStream> | null = null;

function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function getCameraQualityPreset(id?: CameraQualityId | null): CameraQualityPreset {
  return (
    CAMERA_QUALITY_PRESETS.find((preset) => preset.id === id) ?? CAMERA_QUALITY_PRESETS[1]
  );
}

/** List video input devices (labels appear after camera permission). */
export async function listCameraDevices(): Promise<CameraDeviceOption[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "videoinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label?.trim() || `Camera ${index + 1}`,
    }));
}

function buildVideoConstraints(request: CameraStreamRequest): MediaTrackConstraints {
  const facing = request.facing ?? "environment";
  const quality = getCameraQualityPreset(request.quality ?? (isAppleMobile() ? "full-hd" : "hd"));
  // Prefer portrait ideals for phone social capture.
  const portrait = isAppleMobile() || facing === "environment";
  const width = portrait ? quality.height : quality.width;
  const height = portrait ? quality.width : quality.height;

  const base: MediaTrackConstraints = {
    width: { ideal: width },
    height: { ideal: height },
    frameRate: quality.frameRate ? { ideal: quality.frameRate } : undefined,
    aspectRatio: portrait ? { ideal: 9 / 16 } : { ideal: 16 / 9 },
  };

  if (request.deviceId) {
    return { ...base, deviceId: { exact: request.deviceId } };
  }
  return { ...base, facingMode: facing };
}

/** Start getUserMedia during a user gesture (FAB tap) so mobile browsers allow the prompt. */
export function primeCameraStream(request: CameraStreamRequest = {}): Promise<MediaStream> | null {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  const facing = request.facing ?? "environment";
  const includeAudio = request.includeAudio ?? false;
  primedStreamPromise = requestCameraStream({
    facing,
    includeAudio,
    quality: request.quality,
    deviceId: request.deviceId,
  });
  return primedStreamPromise;
}

/** Take the stream primed by primeCameraStream, if any. */
export function consumePrimedCameraStream(): Promise<MediaStream> | null {
  const pending = primedStreamPromise;
  primedStreamPromise = null;
  return pending;
}

export function clearPrimedCameraStream(): void {
  primedStreamPromise = null;
}

export async function requestCameraStream(
  request: CameraStreamRequest = {}
): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera is not supported in this browser.");
  }

  const includeAudio = request.includeAudio ?? false;
  const tryConstraints = async (video: MediaTrackConstraints) => {
    if (!includeAudio) {
      return navigator.mediaDevices.getUserMedia({ video, audio: false });
    }
    try {
      return await navigator.mediaDevices.getUserMedia({ video, audio: true });
    } catch (error) {
      if (isPermissionDenied(error)) throw error;
      return navigator.mediaDevices.getUserMedia({ video, audio: false });
    }
  };

  try {
    return await tryConstraints(buildVideoConstraints(request));
  } catch (error) {
    // Fall back when ultra-hd / exact deviceId is unsupported.
    if (request.quality === "ultra-hd" || request.deviceId) {
      try {
        return await tryConstraints(
          buildVideoConstraints({
            ...request,
            quality: "full-hd",
            deviceId: undefined,
          })
        );
      } catch {
        /* continue */
      }
    }
    if (error instanceof DOMException && error.name === "OverconstrainedError") {
      return tryConstraints({
        facingMode: request.facing ?? "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      });
    }
    throw error;
  }
}

export function pickVideoMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";

  const candidates = isAppleMobile()
    ? ["video/mp4", "video/webm", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus"]
    : [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

export function normalizeRecordedVideoMime(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "video/webm";
  if (base === "video/mp4" || base === "video/webm" || base === "video/quicktime") {
    return base;
  }
  return "video/webm";
}

export function videoFileExtension(mimeType: string): string {
  const normalized = normalizeRecordedVideoMime(mimeType);
  if (normalized === "video/mp4" || normalized === "video/quicktime") return "mp4";
  return "webm";
}

export function createVideoRecorder(stream: MediaStream): { recorder: MediaRecorder; mimeType: string } {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Video recording is not supported in this browser.");
  }

  const preferred = pickVideoMimeType();
  try {
    if (MediaRecorder.isTypeSupported(preferred)) {
      return { recorder: new MediaRecorder(stream, { mimeType: preferred }), mimeType: preferred };
    }
  } catch {
    /* fall through */
  }

  return { recorder: new MediaRecorder(stream), mimeType: preferred };
}

export function isPermissionDenied(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return error.name === "NotAllowedError" || error.name === "PermissionDeniedError";
}

export function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Camera access was blocked. Allow camera and microphone in your browser or device settings, then tap Retry.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No camera was found on this device.";
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "Camera is in use by another app. Close it and try again.";
    }
    if (error.name === "SecurityError") {
      return "Camera access requires a secure connection (HTTPS).";
    }
      if (error.name === "OverconstrainedError") {
      return "This camera quality is not supported. Try HD 720p or Full HD, or flip the camera.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Camera unavailable. Check permissions or try again.";
}
