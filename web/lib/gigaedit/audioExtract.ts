/**
 * Best-effort audio extraction from a local video file.
 * Preserves quality when the browser exposes an audio track via captureStream.
 * Never mutates the source video file.
 */

export async function extractAudioFromVideo(
  videoFile: File,
  options?: { maxDurationSec?: number; signal?: AbortSignal }
): Promise<{ blob: Blob; durationSec: number } | null> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return null;
  }

  const url = URL.createObjectURL(videoFile);
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.muted = false;
  video.volume = 1;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read video for audio extract."));
    });

    const durationSec = Number.isFinite(video.duration) ? video.duration : 0;
    if (durationSec <= 0) return null;

    const stream =
      typeof video.captureStream === "function"
        ? video.captureStream()
        : (
            video as HTMLVideoElement & {
              mozCaptureStream?: () => MediaStream;
            }
          ).mozCaptureStream?.();

    if (!stream) return null;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return null;

    const audioStream = new MediaStream(audioTracks);
    const mimeCandidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ];
    const mimeType =
      mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) || "audio/webm";

    const recorder = new MediaRecorder(audioStream, {
      mimeType,
      audioBitsPerSecond: 192_000,
    });
    const chunks: BlobPart[] = [];

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Audio extract failed."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
    });

    const stopAt = Math.min(durationSec, options?.maxDurationSec ?? durationSec);
    video.currentTime = 0;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    recorder.start(200);
    await video.play();

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        video.pause();
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
        reject(new Error("Audio extract cancelled."));
      };
      options?.signal?.addEventListener("abort", onAbort, { once: true });

      const tick = () => {
        if (options?.signal?.aborted) return;
        if (video.currentTime >= stopAt - 0.05 || video.ended) {
          video.pause();
          try {
            recorder.stop();
          } catch {
            /* ignore */
          }
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });

    const blob = await recorded;
    if (blob.size < 256) return null;
    return { blob, durationSec: stopAt };
  } catch {
    return null;
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
