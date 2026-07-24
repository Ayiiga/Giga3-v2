/**
 * Live screen-share capture helpers.
 * Desktop: getDisplayMedia. Phones: file/camera fallbacks (OS screen capture
 * is not available in most mobile browsers).
 */

export type ScreenShareSource = "display" | "file" | "camera";

let handoffStream: MediaStream | null = null;
let handoffSource: ScreenShareSource | null = null;

export function stashLiveScreenShareStream(
  stream: MediaStream,
  source: ScreenShareSource
): void {
  stopLiveScreenShareHandoff();
  handoffStream = stream;
  handoffSource = source;
}

export function takeLiveScreenShareHandoff(): {
  stream: MediaStream;
  source: ScreenShareSource;
} | null {
  if (!handoffStream || !handoffSource) return null;
  const stream = handoffStream;
  const source = handoffSource;
  handoffStream = null;
  handoffSource = null;
  return { stream, source };
}

export function stopLiveScreenShareHandoff(): void {
  handoffStream?.getTracks().forEach((track) => track.stop());
  handoffStream = null;
  handoffSource = null;
}

export function isLikelyMobileLiveDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  return navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
}

export function supportsOsDisplayCapture(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!window.isSecureContext) return false;
  return typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

type DisplayMediaOptions = MediaStreamConstraints & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: "include" | "exclude";
  systemAudio?: "include" | "exclude";
  surfaceSwitching?: "include" | "exclude";
  monitorTypeSurfaces?: "include" | "exclude";
};

/** OS screen/window/tab picker — desktop and rare mobile browsers that expose it. */
export async function requestOsDisplayCaptureStream(): Promise<MediaStream> {
  if (!supportsOsDisplayCapture()) {
    throw new TypeError("navigator.mediaDevices.getDisplayMedia is not a function");
  }

  const options: DisplayMediaOptions = {
    video: {
      // Prefer a tall phone-friendly frame when the surface allows it.
      width: { ideal: 1080 },
      height: { ideal: 1920 },
      frameRate: { ideal: 24, max: 30 },
    },
    audio: true,
    selfBrowserSurface: "include",
    systemAudio: "include",
    monitorTypeSurfaces: "include",
  };

  try {
    return await navigator.mediaDevices.getDisplayMedia(options);
  } catch (error) {
    // Retry with minimal constraints — some Android builds reject extras.
    if (error instanceof TypeError || error instanceof DOMException) {
      return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }
    throw error;
  }
}

async function attachMicrophone(stream: MediaStream): Promise<MediaStream> {
  if (stream.getAudioTracks().length > 0) return stream;
  if (typeof navigator.mediaDevices?.getUserMedia !== "function") return stream;
  try {
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    for (const track of mic.getAudioTracks()) {
      stream.addTrack(track);
    }
  } catch {
    /* mic optional for file/camera visual share */
  }
  return stream;
}

/**
 * Phone fallback: share a video / screen recording / image from the gallery
 * as the live visual track (+ mic when available).
 */
export async function requestMobileScreenShareFromFile(file: File): Promise<MediaStream> {
  if (typeof document === "undefined") {
    throw new Error("Screen share is only available in the browser.");
  }

  const objectUrl = URL.createObjectURL(file);
  const isImage = file.type.startsWith("image/");

  if (isImage) {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || 1080;
    canvas.height = image.naturalHeight || 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      throw new Error("Could not prepare image for screen share.");
    }
    const draw = () => {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    draw();
    const stream = canvas.captureStream(8);
    // Keep redrawing so the track stays live while the image is shared.
    const timer = window.setInterval(draw, 1000);
    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      window.clearInterval(timer);
      URL.revokeObjectURL(objectUrl);
    });
    return attachMicrophone(stream);
  }

  const video = document.createElement("video");
  video.src = objectUrl;
  video.playsInline = true;
  video.muted = true;
  video.loop = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Could not open that video for screen share."));
  });
  await video.play().catch(() => undefined);

  const capture =
    typeof video.captureStream === "function"
      ? video.captureStream()
      : typeof (
            video as HTMLVideoElement & { mozCaptureStream?: () => MediaStream }
          ).mozCaptureStream === "function"
        ? (
            video as HTMLVideoElement & { mozCaptureStream: () => MediaStream }
          ).mozCaptureStream()
        : null;

  if (!capture) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("This browser cannot share video files as a live screen.");
  }

  capture.getVideoTracks()[0]?.addEventListener("ended", () => {
    URL.revokeObjectURL(objectUrl);
    video.pause();
    video.removeAttribute("src");
    video.load();
  });

  return attachMicrophone(capture);
}

/** Phone fallback: rear camera + mic so hosts can show another screen or content live. */
export async function requestMobileScreenShareCameraStream(): Promise<MediaStream> {
  if (typeof navigator.mediaDevices?.getUserMedia !== "function") {
    throw new Error("Camera is not supported in this browser.");
  }
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1080 },
      height: { ideal: 1920 },
      aspectRatio: { ideal: 9 / 16 },
    },
    audio: true,
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not open that image for screen share."));
    image.src = src;
  });
}
