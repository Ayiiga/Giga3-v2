"use client";

import { MicPermissionSheet } from "@/components/gigaedit/MicPermissionSheet";
import { formatSafeMmSs } from "@/lib/gigaedit/voiceover/duration";
import {
  createOpfsPlaybackUrl,
  deleteVoiceoverSession,
  supportsOpfs,
} from "@/lib/gigaedit/voiceover/opfsStorage";
import {
  muxVoiceoverWithVideo,
  VOICEOVER_EXPORT_CREDITS,
  type MuxProgress,
} from "@/lib/gigaedit/voiceover/mux";
import { VoiceoverRecorder } from "@/lib/gigaedit/voiceover/recorder";
import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type VoiceoverPanelProps = {
  hasVideo: boolean;
  videoFile: File | null;
  onVoiceoverAttached: (file: File, playbackUrl: string) => void;
  onStatus?: (message: string) => void;
};

export function VoiceoverPanel({
  hasVideo,
  videoFile,
  onVoiceoverAttached,
  onStatus,
}: VoiceoverPanelProps) {
  const recorderRef = useRef<VoiceoverRecorder | null>(null);
  const playbackUrlRef = useRef<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [micBlocked, setMicBlocked] = useState(false);
  const [muxing, setMuxing] = useState(false);
  const [muxProgress, setMuxProgress] = useState<MuxProgress | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    };
  }, []);

  async function handleAddVoiceover() {
    if (!supportsOpfs()) {
      onStatus?.("Local storage unavailable — free space and use Chrome.");
      return;
    }
    if (recording) return;

    const recorder = new VoiceoverRecorder();
    recorder.setCallbacks({
      onWaveform: setWaveform,
      onDuration: setDurationSec,
      onError: (msg) => onStatus?.(msg),
    });
    recorderRef.current = recorder;

    try {
      await recorder.start();
      setRecording(true);
      setMicBlocked(false);
      onStatus?.("Recording voiceover… speak clearly.");
    } catch {
      setMicBlocked(true);
      onStatus?.("Microphone permission denied.");
    }
  }

  async function handleStopVoiceover() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setRecording(false);
    const result = await recorder.stop();
    recorderRef.current = null;
    if (!result) return;

    setSessionId(result.sessionId);
    if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    const url = await createOpfsPlaybackUrl(result.sessionId);
    playbackUrlRef.current = url;
    setPlaybackUrl(url);
    onStatus?.("Voiceover saved on device. Tap Mix to attach to video.");
  }

  async function handleMixVoiceover() {
    if (!sessionId || !videoFile) {
      onStatus?.("Import a video and record voiceover first.");
      return;
    }

    setMuxing(true);
    setMuxProgress({
      phase: "preparing",
      progress: 0,
      message: `This export uses ${VOICEOVER_EXPORT_CREDITS} credits`,
    });

    try {
      const muxed = await muxVoiceoverWithVideo({
        videoFile,
        voiceoverSessionId: sessionId,
        onProgress: setMuxProgress,
      });
      const url = URL.createObjectURL(muxed);
      if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = url;
      setPlaybackUrl(url);
      onVoiceoverAttached(muxed, url);
      onStatus?.("Voiceover mixed — playback updated from local storage.");
    } catch (err) {
      onStatus?.(err instanceof Error ? err.message : "Could not mix voiceover.");
    } finally {
      setMuxing(false);
    }
  }

  async function handleDiscard() {
    if (sessionId) await deleteVoiceoverSession(sessionId);
    if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    playbackUrlRef.current = null;
    setSessionId(null);
    setPlaybackUrl(null);
    setDurationSec(0);
    setWaveform([]);
    onStatus?.("Voiceover discarded.");
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[var(--ge-muted)]">
        This export uses {VOICEOVER_EXPORT_CREDITS} credits when you mix voiceover into video.
      </p>

      <div className="gigaedit-voiceover-wave" aria-hidden>
        {(waveform.length ? waveform : [0.1, 0.15, 0.1, 0.2, 0.12, 0.08]).map((level, i) => (
          <span
            key={i}
            className="gigaedit-voiceover-wave__bar"
            style={{ transform: `scaleY(${Math.max(0.12, level)})` }}
          />
        ))}
      </div>

      <p className="text-center text-xs font-medium text-white">
        {formatSafeMmSs(durationSec)}
      </p>

      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <button
            type="button"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--ge-gold)] px-4 py-2 text-xs font-bold text-[#0b1220] disabled:opacity-40"
            disabled={!hasVideo || muxing}
            onClick={() => void handleAddVoiceover()}
          >
            <Mic className="h-4 w-4" aria-hidden />
            🎙️ Add Voiceover
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-red-400/50 px-4 py-2 text-xs font-semibold text-red-200"
            onClick={() => void handleStopVoiceover()}
          >
            <Square className="h-4 w-4" aria-hidden />
            Stop recording
          </button>
        )}

        {sessionId && !recording ? (
          <>
            <button
              type="button"
              className="min-h-[44px] rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs text-[var(--ge-gold)] disabled:opacity-40"
              disabled={muxing || !videoFile}
              onClick={() => void handleMixVoiceover()}
            >
              Mix to video
            </button>
            <button
              type="button"
              className="min-h-[44px] rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs text-white/70"
              onClick={() => void handleDiscard()}
            >
              Discard
            </button>
          </>
        ) : null}
      </div>

      {muxProgress ? (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--ge-gold)] transition-[width] duration-200"
              style={{ width: `${Math.round(muxProgress.progress * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--ge-muted)]">{muxProgress.message}</p>
        </div>
      ) : null}

      {playbackUrl ? (
        <audio controls src={playbackUrl} className="w-full" preload="metadata" />
      ) : null}

      <MicPermissionSheet
        open={micBlocked}
        onRetry={() => {
          setMicBlocked(false);
          void handleAddVoiceover();
        }}
        onDismiss={() => setMicBlocked(false)}
      />
    </div>
  );
}
