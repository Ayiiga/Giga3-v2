"use client";

import { GigaSocialTeleprompter } from "@/components/gigasocial/studio/GigaSocialTeleprompter";
import {
  CAMERA_FILTERS,
  getCameraFilterCss,
  type CameraFilterId,
} from "@/lib/gigasocial/cameraFilters";
import { SOCIAL_MAX_VIDEO_DURATION_SEC } from "@/lib/gigasocial/constants";
import {
  CAMERA_QUALITY_PRESETS,
  consumePrimedCameraStream,
  createVideoRecorder,
  getCameraErrorMessage,
  listCameraDevices,
  normalizeRecordedVideoMime,
  requestCameraStream,
  videoFileExtension,
  type CameraDeviceOption,
  type CameraFacing,
  type CameraQualityId,
} from "@/lib/gigasocial/cameraCapture";
import { cn } from "@/lib/utils";
import {
  Camera,
  Grid3X3,
  Loader2,
  Sparkles,
  SwitchCamera,
  Timer,
  Type,
  Video,
  X,
  Zap,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type GigaSocialCameraCapture = {
  file: File;
  kind: "image" | "video";
  durationSec?: number;
  filterId?: CameraFilterId;
};

type GigaSocialCameraStudioProps = {
  open: boolean;
  defaultMode?: "photo" | "video";
  /** Open with teleprompter visible (AI Studio / Script launch). */
  initialTeleprompter?: boolean;
  onClose: () => void;
  onCapture: (result: GigaSocialCameraCapture) => void;
};

type CaptureMode = "photo" | "video";

export const GigaSocialCameraStudio = memo(function GigaSocialCameraStudio({
  open,
  defaultMode = "photo",
  initialTeleprompter = false,
  onClose,
  onCapture,
}: GigaSocialCameraStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const recordSecRef = useRef(0);
  const activeFilterRef = useRef<CameraFilterId>("none");
  const audioMutedRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CaptureMode>(defaultMode);
  const [facing, setFacing] = useState<CameraFacing>("environment");
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(initialTeleprompter);
  const [timerSec, setTimerSec] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [beautyOn, setBeautyOn] = useState(false);
  const [filterId, setFilterId] = useState<CameraFilterId>("none");
  const [busy, setBusy] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [quality, setQuality] = useState<CameraQualityId>("full-hd");
  const [cameraDevices, setCameraDevices] = useState<CameraDeviceOption[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  const clearRecordTimer = useCallback(() => {
    if (recordTimerRef.current != null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current != null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const attachStream = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;
    const hasAudio = stream.getAudioTracks().some((track) => track.enabled);
    audioMutedRef.current = mode === "video" && !hasAudio;
    setAudioMuted(audioMutedRef.current);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setReady(true);
  }, [mode]);

  const startStream = useCallback(async () => {
    if (recorderRef.current?.state === "recording") return;
    stopStream();
    setReady(false);
    setError(null);
    try {
      const primed = consumePrimedCameraStream();
      const stream = primed
        ? await primed
        : await requestCameraStream({
            facing,
            includeAudio: mode === "video",
            quality,
            deviceId,
          });
      await attachStream(stream);
      const devices = await listCameraDevices();
      setCameraDevices(devices);
    } catch (err) {
      setError(getCameraErrorMessage(err));
    }
  }, [attachStream, deviceId, facing, mode, quality, stopStream]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    activeFilterRef.current = beautyOn ? "natural" : filterId;
  }, [beautyOn, filterId]);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setShowTeleprompter(initialTeleprompter);
  }, [defaultMode, initialTeleprompter, open]);

  useEffect(() => {
    if (!open) return;
    void startStream();
    return () => {
      clearCountdownTimer();
      clearRecordTimer();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
        recorderRef.current = null;
      }
      stopStream();
    };
  }, [clearCountdownTimer, clearRecordTimer, deviceId, facing, mode, open, quality, startStream, stopStream]);

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !ready || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture photo.");
      const filter = getCameraFilterCss(activeFilterRef.current);
      if (filter && filter !== "none") ctx.filter = filter;
      if (facing === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("Could not save photo.");
      const file = new File([blob], `gigasocial-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture({ file, kind: "image", filterId: activeFilterRef.current });
      onClose();
    } catch (err) {
      setError(getCameraErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [busy, facing, onCapture, onClose, ready]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    try {
      if (recorder.state === "recording") {
        recorder.requestData();
      }
      recorder.stop();
    } catch {
      recorderRef.current = null;
      clearRecordTimer();
      setRecording(false);
      setBusy(false);
    }
  }, [clearRecordTimer]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recording || busy) return;
    setBusy(true);
    setError(null);
    try {
      chunksRef.current = [];
      const { recorder, mimeType } = createVideoRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("Recording failed. Try again or switch browsers.");
        recorderRef.current = null;
        clearRecordTimer();
        setRecording(false);
        setBusy(false);
      };
      recorder.onstop = () => {
        const normalizedMime = normalizeRecordedVideoMime(mimeType);
        const blob = new Blob(chunksRef.current, { type: normalizedMime });
        if (!blob.size) {
          setError("No video was captured. Hold record a little longer and try again.");
          recorderRef.current = null;
          clearRecordTimer();
          setRecording(false);
          setBusy(false);
          return;
        }
        const ext = videoFileExtension(normalizedMime);
        const file = new File([blob], `gigasocial-${Date.now()}.${ext}`, {
          type: normalizedMime,
        });
        const durationSec = Math.max(recordSecRef.current, 1);
        onCapture({
          file,
          kind: "video",
          durationSec,
          filterId: activeFilterRef.current,
        });
        recordSecRef.current = 0;
        setRecordSec(0);
        recorderRef.current = null;
        clearRecordTimer();
        setRecording(false);
        setBusy(false);
        onClose();
      };
      recorder.start(250);
      setRecording(true);
      recordSecRef.current = 0;
      setRecordSec(0);
      recordTimerRef.current = window.setInterval(() => {
        recordSecRef.current += 1;
        setRecordSec(recordSecRef.current);
        if (recordSecRef.current >= SOCIAL_MAX_VIDEO_DURATION_SEC) {
          stopRecording();
        }
      }, 1000);
      setBusy(false);
    } catch (err) {
      setError(getCameraErrorMessage(err));
      setBusy(false);
    }
  }, [busy, clearRecordTimer, onCapture, onClose, recording, stopRecording]);

  const runCapture = useCallback(() => {
    if (mode === "photo") {
      void capturePhoto();
      return;
    }
    if (recording) {
      stopRecording();
      return;
    }
    if (timerSec > 0) {
      clearCountdownTimer();
      setCountdown(timerSec);
      let left = timerSec;
      countdownTimerRef.current = window.setInterval(() => {
        left -= 1;
        setCountdown(left);
        if (left <= 0) {
          clearCountdownTimer();
          startRecording();
        }
      }, 1000);
      return;
    }
    startRecording();
  }, [capturePhoto, clearCountdownTimer, mode, recording, startRecording, stopRecording, timerSec]);

  const switchMode = useCallback(
    (nextMode: CaptureMode) => {
      if (nextMode === mode) return;
      if (recording) stopRecording();
      setMode(nextMode);
    },
    [mode, recording, stopRecording]
  );

  if (!mounted || !open) return null;

  const previewFilter = getCameraFilterCss(beautyOn ? "natural" : filterId);

  return createPortal(
    <div className="gigasocial-stable gigasocial-camera-studio fixed inset-0 z-[70] flex flex-col bg-black text-white">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 hover:bg-white/10"
            aria-label="Close camera"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex gap-1 rounded-full bg-white/10 p-0.5">
            <button
              type="button"
              onClick={() => switchMode("photo")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                mode === "photo" ? "bg-violet-600 text-white" : "text-white/80"
              )}
            >
              Photo
            </button>
            <button
              type="button"
              onClick={() => switchMode("video")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                mode === "video" ? "bg-violet-600 text-white" : "text-white/80"
              )}
            >
              Video
            </button>
          </div>
          <span className="w-9" aria-hidden />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <video
            ref={videoRef}
            className={cn(
              "gigasocial-camera-preview h-full w-full object-cover",
              facing === "user" && "scale-x-[-1]"
            )}
            style={{ filter: previewFilter !== "none" ? previewFilter : undefined }}
            playsInline
            muted
            autoPlay
          />
          {!ready && !error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-8 w-8 animate-spin text-white/80" aria-hidden />
              <span className="sr-only">Starting camera…</span>
            </div>
          ) : null}
          {showGrid ? (
            <div
              className="pointer-events-none absolute inset-0 opacity-35"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "33.33% 33.33%",
              }}
              aria-hidden
            />
          ) : null}
          {countdown != null ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-5xl font-bold">
              {countdown}
            </div>
          ) : null}
          {recording ? (
            <div className="absolute left-3 top-3 rounded-full bg-red-600/90 px-2 py-0.5 text-xs font-semibold">
              REC {recordSec}s / {SOCIAL_MAX_VIDEO_DURATION_SEC}s
            </div>
          ) : null}
          {mode === "video" && audioMuted && ready ? (
            <p className="absolute right-3 top-3 max-w-[10rem] rounded-lg bg-black/60 px-2 py-1 text-[10px] text-amber-100">
              Recording without microphone — allow mic access for audio.
            </p>
          ) : null}
          <GigaSocialTeleprompter active={showTeleprompter} recording={recording} />
        </div>

        <div className="space-y-2 border-t border-white/10 px-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-white/55">
              Quality
            </span>
            {CAMERA_QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={recording || busy}
                onClick={() => setQuality(preset.id)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                  quality === preset.id
                    ? "bg-violet-600 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/15"
                )}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {cameraDevices.length > 1 ? (
            <label className="flex items-center gap-2 text-[10px] text-white/70">
              <span className="shrink-0 font-semibold uppercase tracking-wide text-white/55">
                Camera
              </span>
              <select
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-[11px] text-white"
                value={deviceId ?? ""}
                disabled={recording || busy}
                onChange={(event) => {
                  const next = event.target.value || undefined;
                  setDeviceId(next);
                }}
              >
                <option value="">Auto ({facing === "user" ? "Front" : "Rear"})</option>
                {cameraDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2">
          <ToolButton
            label="Flip"
            onClick={() => {
              setDeviceId(undefined);
              setFacing((value) => (value === "user" ? "environment" : "user"));
            }}
            icon={<SwitchCamera className="h-4 w-4" />}
          />
          <ToolButton
            label="Grid"
            active={showGrid}
            onClick={() => setShowGrid((value) => !value)}
            icon={<Grid3X3 className="h-4 w-4" />}
          />
          <ToolButton
            label="Timer"
            active={timerSec === 3}
            onClick={() => setTimerSec((value) => (value === 3 ? 0 : 3))}
            icon={<Timer className="h-4 w-4" />}
          />
          <ToolButton
            label="Script"
            active={showTeleprompter}
            onClick={() => setShowTeleprompter((value) => !value)}
            icon={<Type className="h-4 w-4" />}
          />
          <ToolButton
            label="Beauty"
            active={beautyOn}
            onClick={() => setBeautyOn((value) => !value)}
            icon={<Sparkles className="h-4 w-4" />}
          />
          <ToolButton
            label="AI look"
            active={filterId !== "none"}
            onClick={() =>
              setFilterId((current) => {
                const ids = CAMERA_FILTERS.map((f) => f.id);
                const idx = ids.indexOf(current);
                return ids[(idx + 1) % ids.length] ?? "none";
              })
            }
            icon={<Zap className="h-4 w-4" />}
          />
        </div>

        <div className="flex items-center justify-center gap-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            disabled={!ready || busy || countdown != null}
            onClick={runCapture}
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full border-4 border-white",
              mode === "video" && recording ? "bg-red-500" : "bg-white/20",
              (!ready || busy) && "opacity-50"
            )}
            aria-label={mode === "photo" ? "Take photo" : recording ? "Stop recording" : "Start recording"}
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : mode === "photo" ? (
              <Camera className="h-7 w-7" />
            ) : (
              <Video className="h-7 w-7" />
            )}
          </button>
        </div>

        {error ? (
          <div className="space-y-2 px-4 pb-3 text-center">
            <p className="text-xs text-red-200" role="alert">
              {error}
            </p>
            <button
              type="button"
              className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white"
              onClick={() => void startStream()}
            >
              Retry camera
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
});

function ToolButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px]",
        active ? "bg-violet-600/80 text-white" : "text-white/85 hover:bg-white/10"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
