/** Camera + MediaRecorder helpers for GigaSocial capture studio. */

export type CameraFacing = "user" | "environment";

export type CameraStreamRequest = {
  facing?: CameraFacing;
  includeAudio?: boolean;
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

/** Start getUserMedia during a user gesture (FAB tap) so mobile browsers allow the prompt. */
export function primeCameraStream(request: CameraStreamRequest = {}): Promise<MediaStream> | null {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  const facing = request.facing ?? "environment";
  const includeAudio = request.includeAudio ?? false;
  primedStreamPromise = requestCameraStream({ facing, includeAudio });
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

  const facing = request.facing ?? "environment";
  const includeAudio = request.includeAudio ?? false;
  const video: MediaTrackConstraints = isAppleMobile()
    ? {
        facingMode: facing,
        width: { ideal: 1080 },
        height: { ideal: 1920 },
        aspectRatio: { ideal: 9 / 16 },
      }
    : { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } };

  if (!includeAudio) {
    return navigator.mediaDevices.getUserMedia({ video, audio: false });
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: true });
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw error;
    }
    // Mic unavailable (in use / missing) — still allow silent video capture.
    return navigator.mediaDevices.getUserMedia({ video, audio: false });
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
      return "This camera mode is not supported on your device. Try flipping the camera.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Camera unavailable. Check permissions or try again.";
}
