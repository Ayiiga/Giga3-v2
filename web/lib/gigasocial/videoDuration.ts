/**
 * Robust client-side video duration probing for GigaSocial.
 * Android Chrome often fails bare metadata loads unless the element is muted +
 * playsInline, and Infinity-duration seek tricks can fire spurious errors.
 */

export type ReadVideoDurationOptions = {
  /** Abort an in-flight probe (e.g. user picked another file). */
  signal?: AbortSignal;
  /** Per-attempt timeout. Default 8s. */
  timeoutMs?: number;
  /** Total attempts including the first. Default 2. */
  retries?: number;
  /** Injected factory for tests. */
  createVideoElement?: () => HTMLVideoElement;
  /** Injected object-URL helpers for tests. */
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

export function isUsableVideoDuration(duration: number): boolean {
  return Number.isFinite(duration) && duration > 0 && duration !== Infinity;
}

async function probeOnce(
  file: File,
  options: ReadVideoDurationOptions,
  preload: "metadata" | "auto"
): Promise<number> {
  const createVideo =
    options.createVideoElement ?? (() => document.createElement("video"));
  const createObjectURL =
    options.createObjectURL ??
    ((blob: Blob) => URL.createObjectURL(blob));
  const revokeObjectURL =
    options.revokeObjectURL ?? ((url: string) => URL.revokeObjectURL(url));
  const timeoutMs = options.timeoutMs ?? 8000;
  const signal = options.signal;

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const url = createObjectURL(file);
  const video = createVideo();
  video.preload = preload;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  // Keep decode off-screen; some Android WebViews refuse metadata otherwise.
  video.setAttribute("muted", "");
  (video as HTMLVideoElement & { disableRemotePlayback?: boolean }).disableRemotePlayback =
    true;

  return await new Promise<number>((resolve, reject) => {
    let finished = false;
    let seekAttempted = false;
    let timeoutId: number | undefined;

    const finish = (result: { duration?: number; error?: Error | DOMException }) => {
      if (finished) return;
      finished = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
      video.removeEventListener("loadedmetadata", onDurationLikeEvent);
      video.removeEventListener("loadeddata", onDurationLikeEvent);
      video.removeEventListener("durationchange", onDurationLikeEvent);
      video.removeEventListener("timeupdate", onDurationLikeEvent);
      video.removeEventListener("seeked", onDurationLikeEvent);
      video.removeEventListener("error", onErrorEvent);
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        /* ignore */
      }
      revokeObjectURL(url);
      if (result.error) {
        reject(result.error);
        return;
      }
      resolve(result.duration!);
    };

    const readDuration = (): number | null => {
      const direct = video.duration;
      if (isUsableVideoDuration(direct)) return direct;
      const seekableEnd =
        video.seekable && video.seekable.length > 0
          ? video.seekable.end(video.seekable.length - 1)
          : NaN;
      if (isUsableVideoDuration(seekableEnd)) return seekableEnd;
      return null;
    };

    const onAbort = () => finish({ error: new DOMException("Aborted", "AbortError") });
    const onErrorEvent = () => finish({ error: new Error("Could not read video duration.") });

    const onDurationLikeEvent = (event: Event) => {
      const duration = readDuration();
      if (duration != null) {
        finish({ duration });
        return;
      }
      if (Number.isFinite(video.duration) && video.duration <= 0) {
        finish({ error: new Error("Could not read video duration.") });
        return;
      }
      if (event.type === "loadeddata" && Number.isNaN(video.duration)) {
        finish({ error: new Error("Could not read video duration.") });
        return;
      }
      if (seekAttempted) return;
      // Some Android WebViews expose Infinity until forced seek.
      if (video.duration === Infinity || !Number.isFinite(video.duration)) {
        seekAttempted = true;
        try {
          video.currentTime = 1e101;
        } catch {
          /* ignore */
        }
      }
    };

    timeoutId = window.setTimeout(() => {
      finish({ error: new Error("Timed out reading video duration.") });
    }, timeoutMs);

    if (signal?.aborted) {
      finish({ error: new DOMException("Aborted", "AbortError") });
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    video.addEventListener("loadedmetadata", onDurationLikeEvent);
    video.addEventListener("loadeddata", onDurationLikeEvent);
    video.addEventListener("durationchange", onDurationLikeEvent);
    video.addEventListener("timeupdate", onDurationLikeEvent);
    video.addEventListener("seeked", onDurationLikeEvent);
    video.addEventListener("error", onErrorEvent, { once: true });

    video.src = url;
    try {
      video.load();
    } catch {
      /* some engines throw if already loading */
    }
  });
}

/**
 * Read duration in seconds for a local video File.
 * Retries once with preload=auto after a metadata-only failure (common on Android).
 */
export async function readSocialVideoDuration(
  file: File,
  options: ReadVideoDurationOptions = {}
): Promise<number> {
  const retries = Math.max(1, options.retries ?? 2);
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const preload: "metadata" | "auto" = attempt === 1 ? "metadata" : "auto";
    try {
      const duration = await probeOnce(file, options, preload);
      if (!isUsableVideoDuration(duration)) {
        throw new Error("Could not read video duration.");
      }
      return duration;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => window.setTimeout(resolve, 120 * attempt));
      }
    }
  }

  if (lastError instanceof Error) {
    const message = lastError.message.includes("Timed out")
      ? "Could not read video duration on this device. Try another MP4, or record in-app."
      : lastError.message;
    throw new Error(message);
  }
  throw new Error("Could not read video duration.");
}
