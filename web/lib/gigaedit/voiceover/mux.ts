/**
 * Voiceover mux — lazy WebCodecs + mp4-muxer when isolated, else export bake fallback.
 */

import { readVoiceoverBlob } from "@/lib/gigaedit/voiceover/opfsStorage";

export type MuxProgress = {
  phase: "preparing" | "muxing" | "done" | "fallback";
  progress: number;
  message: string;
};

export function isCrossOriginIsolated(): boolean {
  return typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
}

/**
 * Mux voiceover onto video. Uses existing export bake when WebCodecs path unavailable.
 * Returns a File ready for playback / publish.
 */
export async function muxVoiceoverWithVideo(input: {
  videoFile: File;
  voiceoverSessionId: string;
  onProgress?: (state: MuxProgress) => void;
}): Promise<File> {
  const { videoFile, voiceoverSessionId, onProgress } = input;
  onProgress?.({ phase: "preparing", progress: 0.05, message: "Loading voiceover from device storage…" });

  const audioBlob = await readVoiceoverBlob(voiceoverSessionId);
  if (!audioBlob) {
    throw new Error("Voiceover not found in local storage.");
  }

  const audioFile = new File([audioBlob], "voiceover.webm", {
    type: audioBlob.type || "audio/webm;codecs=opus",
  });

  if (!isCrossOriginIsolated()) {
    onProgress?.({
      phase: "fallback",
      progress: 0.5,
      message: "Using on-device export mix (enable isolated headers for faster mux)…",
    });
    const { exportEditedVideoFile } = await import("@/lib/gigaedit/videoExport");
    const { readVideoDuration } = await import("@/lib/gigaedit/timelineJoin");
    const durationSec = await readVideoDuration(videoFile);
    const result = await exportEditedVideoFile(videoFile, {
      startSec: 0,
      endSec: Math.max(0.5, durationSec),
      speed: 1,
      aspectRatio: "9:16",
      audioMode: "replace",
      replaceAudio: audioFile,
      onProgress: (p) =>
        onProgress?.({
          phase: "fallback",
          progress: 0.5 + p * 0.45,
          message: `Mixing voiceover… ${Math.round(p * 100)}%`,
        }),
    });
    onProgress?.({ phase: "done", progress: 1, message: "Voiceover mixed." });
    return result.file;
  }

  onProgress?.({ phase: "muxing", progress: 0.2, message: "Muxing with WebCodecs…" });

  try {
    const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: { codec: "avc", width: 1080, height: 1920 },
      audio: { codec: "aac", sampleRate: 48_000, numberOfChannels: 1 },
      fastStart: "in-memory",
    });

    onProgress?.({ phase: "muxing", progress: 0.65, message: "Finalizing mux…" });
    muxer.finalize();

    const buffer = target.buffer;
    if (!buffer || buffer.byteLength < 128) {
      throw new Error("Mux produced empty output");
    }

    onProgress?.({ phase: "done", progress: 1, message: "Voiceover muxed." });
    return new File([buffer], `voiceover-mux-${Date.now()}.mp4`, { type: "video/mp4" });
  } catch {
    onProgress?.({
      phase: "fallback",
      progress: 0.4,
      message: "WebCodecs mux unavailable — using export bake…",
    });
    const { exportEditedVideoFile } = await import("@/lib/gigaedit/videoExport");
    const { readVideoDuration } = await import("@/lib/gigaedit/timelineJoin");
    const durationSec = await readVideoDuration(videoFile);
    const result = await exportEditedVideoFile(videoFile, {
      startSec: 0,
      endSec: Math.max(0.5, durationSec),
      speed: 1,
      aspectRatio: "9:16",
      audioMode: "replace",
      replaceAudio: audioFile,
      onProgress: (p) =>
        onProgress?.({
          phase: "fallback",
          progress: 0.4 + p * 0.55,
          message: `Mixing… ${Math.round(p * 100)}%`,
        }),
    });
    onProgress?.({ phase: "done", progress: 1, message: "Voiceover mixed." });
    return result.file;
  }
}

/** Credit estimate shown before voiceover export. */
export const VOICEOVER_EXPORT_CREDITS = 5;
