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

function waitForEvent(
  target: EventTarget,
  eventName: string,
  signal?: AbortSignal
): Promise<Event> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onEvent = (event: Event) => {
      cleanup();
      resolve(event);
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const cleanup = () => {
      target.removeEventListener(eventName, onEvent);
      signal?.removeEventListener("abort", onAbort);
    };
    target.addEventListener(eventName, onEvent, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });
  });
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

  let settled = false;
  const cleanup = () => {
    video.onloadedmetadata = null;
    video.onloadeddata = null;
    video.ondurationchange = null;
    video.onerror = null;
    video.removeAttribute("src");
    try {
      video.load();
    } catch {
      /* ignore */
    }
    revokeObjectURL(url);
  };

  const readDuration = (): number | null => {
    const duration = video.duration;
    return isUsableVideoDuration(duration) ? duration : null;
  };

  let timeoutId: number | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error("Timed out reading video duration."));
      }, timeoutMs);
      signal?.addEventListener(
        "abort",
        () => {
          if (timeoutId != null) window.clearTimeout(timeoutId);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true }
      );
    });

    const metadataPromise = (async () => {
      video.src = url;
      try {
        video.load();
      } catch {
        /* some engines throw if already loading */
      }

      await Promise.race([
        waitForEvent(video, "loadedmetadata", signal),
        waitForEvent(video, "durationchange", signal),
        waitForEvent(video, "loadeddata", signal),
        waitForEvent(video, "error", signal).then(() => {
          throw new Error("Could not read video duration.");
        }),
      ]);

      let duration = readDuration();
      if (duration != null) return duration;

      // Chrome/WebKit sometimes report Infinity until a seek forces the true length.
      if (video.duration === Infinity || !Number.isFinite(video.duration)) {
        const seekableEnd =
          video.seekable && video.seekable.length > 0
            ? video.seekable.end(video.seekable.length - 1)
            : NaN;
        if (isUsableVideoDuration(seekableEnd)) {
          return seekableEnd;
        }

        const seekTarget = Number.isFinite(seekableEnd) && seekableEnd > 0 ? seekableEnd : 1e101;
        try {
          const seeked = waitForEvent(video, "timeupdate", signal);
          video.currentTime = seekTarget;
          await Promise.race([
            seeked,
            waitForEvent(video, "seeked", signal),
            new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
          ]);
        } catch {
          /* seek may fail on Android — fall through */
        }
        try {
          video.currentTime = 0;
        } catch {
          /* ignore */
        }
        duration = readDuration();
        if (duration != null) return duration;
        if (isUsableVideoDuration(seekableEnd)) return seekableEnd;
      }

      throw new Error("Could not read video duration.");
    })();

    const duration = await Promise.race([metadataPromise, timeoutPromise]);
    settled = true;
    if (timeoutId != null) window.clearTimeout(timeoutId);
    cleanup();
    return duration;
  } catch (error) {
    if (timeoutId != null) window.clearTimeout(timeoutId);
    if (!settled) cleanup();
    throw error;
  }
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
