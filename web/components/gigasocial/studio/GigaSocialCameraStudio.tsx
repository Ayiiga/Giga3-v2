"use client";

import { Button } from "@/components/ui/Button";
import { GigaSocialTeleprompter } from "@/components/gigasocial/studio/GigaSocialTeleprompter";
import {
  CAMERA_FILTERS,
  getCameraFilterCss,
  type CameraFilterId,
} from "@/lib/gigasocial/cameraFilters";
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
  onClose: () => void;
  onCapture: (result: GigaSocialCameraCapture) => void;
};

type CaptureMode = "photo" | "video";

function pickVideoMime(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

export const GigaSocialCameraStudio = memo(function GigaSocialCameraStudio({
  open,
  defaultMode = "photo",
  onClose,
  onCapture,
}: GigaSocialCameraStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CaptureMode>(defaultMode);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [beautyOn, setBeautyOn] = useState(false);
  const [filterId, setFilterId] = useState<CameraFilterId>("none");
  const [busy, setBusy] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
    setReady(false);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === "video",
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch {
      setError("Camera unavailable. Check permissions or try again.");
    }
  }, [facing, mode, stopStream]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    void startStream();
    return () => {
      stopStream();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [defaultMode, open, startStream, stopStream]);

  useEffect(() => {
    if (!open) return;
    void startStream();
  }, [facing, mode, open, startStream]);

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
      const filter = getCameraFilterCss(beautyOn ? "natural" : filterId);
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
      onCapture({ file, kind: "image", filterId: beautyOn ? "natural" : filterId });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not capture photo.");
    } finally {
      setBusy(false);
    }
  }, [beautyOn, busy, facing, filterId, onCapture, onClose, ready]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream || recording || busy) return;
    setBusy(true);
    try {
      chunksRef.current = [];
      const mimeType = pickVideoMime();
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `gigasocial-${Date.now()}.${ext}`, { type: mimeType });
        onCapture({
          file,
          kind: "video",
          durationSec: recordSec,
          filterId: beautyOn ? "natural" : filterId,
        });
        setRecordSec(0);
        setBusy(false);
        onClose();
      };
      recorder.start(250);
      setRecording(true);
      setRecordSec(0);
      timerRef.current = window.setInterval(() => {
        setRecordSec((value) => value + 1);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start recording.");
      setBusy(false);
    }
  }, [beautyOn, busy, filterId, onCapture, onClose, recordSec, recording]);

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
      setCountdown(timerSec);
      let left = timerSec;
      const id = window.setInterval(() => {
        left -= 1;
        setCountdown(left);
        if (left <= 0) {
          window.clearInterval(id);
          setCountdown(null);
          void startRecording();
        }
      }, 1000);
      return;
    }
    void startRecording();
  }, [capturePhoto, mode, recording, startRecording, stopRecording, timerSec]);

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
              onClick={() => setMode("photo")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                mode === "photo" ? "bg-violet-600 text-white" : "text-white/80"
              )}
            >
              Photo
            </button>
            <button
              type="button"
              onClick={() => setMode("video")}
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
              "h-full w-full object-cover",
              facing === "user" && "scale-x-[-1]"
            )}
            style={{ filter: previewFilter !== "none" ? previewFilter : undefined }}
            playsInline
            muted
          />
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
              REC {recordSec}s
            </div>
          ) : null}
          <GigaSocialTeleprompter
            active={showTeleprompter}
            recording={recording}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2">
          <ToolButton
            label="Flip"
            onClick={() => setFacing((value) => (value === "user" ? "environment" : "user"))}
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
          <p className="px-4 pb-3 text-center text-xs text-red-200" role="alert">
            {error}
          </p>
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
