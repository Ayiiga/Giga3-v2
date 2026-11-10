"use client";

import { useBackToClose } from "@/hooks/useBackToClose";
import { CameraStylePreview } from "@/components/gigaedit/CameraStylePreview";
import dynamic from "next/dynamic";

const GigaSocialTeleprompter = dynamic(
  () =>
    import("@/components/gigasocial/studio/GigaSocialTeleprompter").then(
      (mod) => mod.GigaSocialTeleprompter
    ),
  { ssr: false }
);
import {
  ULTRA_CLEAR_CAMERA_LOOK,
  applyCameraTrackEnhancements,
  buildProCameraConstraints,
  type CameraLookOptions,
} from "@/lib/gigaedit/cameraLook";
import { detectDeviceTier } from "@/lib/gigaedit/deviceCapability";
import {
  createEmptyProject,
  putProjectOriginalBlob,
  saveGigaEditProject,
} from "@/lib/gigaedit/projects";
import { handoffAndOpenGigaSocial } from "@/lib/gigaedit/publishHandoff";
import { loadTeleprompterScript, saveTeleprompterScript } from "@/lib/gigasocial/teleprompterScripts";
import { Circle, Loader2, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TeleprompterStudioProps = {
  /** Scroll to record controls (Creator Home → Record Video). */
  focusRecord?: boolean;
  /** Open fullscreen camera as soon as the tab loads. */
  autoOpenCamera?: boolean;
};

export function TeleprompterStudio({
  focusRecord = false,
  autoOpenCamera = false,
}: TeleprompterStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoOpenAttemptedRef = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const mountedRef = useRef(false);
  const [cameraLook] = useState<CameraLookOptions>({ ...ULTRA_CLEAR_CAMERA_LOOK, hdr: false, whiteBalance: "auto" });
  const [mounted, setMounted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedFileRef = useRef<File | null>(null);
  const recordControlsRef = useRef<HTMLDivElement>(null);
  const tier = useMemo(() => detectDeviceTier(), []);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    setScript(loadTeleprompterScript());
    return () => {
      mountedRef.current = false;
      if (mediaRecorderRef.current) mediaRecorderRef.current.onstop = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const enableCamera = useCallback(async () => {
    if (cameraLoading || cameraOn) return;
    setCameraLoading(true);
    setStatus(null);
    try {
      const constraints = buildProCameraConstraints({
        facingMode: "user",
        look: cameraLook,
        tier,
      });
      const next = await navigator.mediaDevices.getUserMedia(constraints);
      if (!mountedRef.current) { next.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = next;
      setStream(next);
      await applyCameraTrackEnhancements(next, cameraLook);
      if (mountedRef.current) setCameraOn(true);
    } catch {
      setStatus("Allow camera and microphone access, then tap Open camera.");
    } finally {
      setCameraLoading(false);
    }
  }, [cameraLoading, cameraLook, cameraOn, tier]);

  useEffect(() => {
    if (!autoOpenCamera || autoOpenAttemptedRef.current || cameraOn) return;
    autoOpenAttemptedRef.current = true;
    void enableCamera();
  }, [autoOpenCamera, cameraOn, enableCamera]);

  useEffect(() => {
    if (!focusRecord || !cameraOn) return;
    recordControlsRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
  }, [focusRecord, cameraOn]);

  function disableCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setRecording(false);
    setScript(loadTeleprompterScript());
    autoOpenAttemptedRef.current = false;
  }

  useBackToClose(cameraOn, disableCamera);

  function startRecording() {
    const active = streamRef.current;
    if (!active) {
      setStatus("Enable the camera first.");
      return;
    }
    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try { recorder = new MediaRecorder(active); }
    catch { setStatus("Video recording is unavailable on this device."); return; }
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      mediaRecorderRef.current = null;
      setRecording(false);
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      if (!blob.size) { setStatus("No video was captured. Please record again."); return; }
      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `gigaedit-teleprompter-${Date.now()}.${extension}`, {
        type: blob.type || "video/webm",
      });
      recordedFileRef.current = file;
      setHasRecording(true);
      void (async () => {
        const project = createEmptyProject({ kind: "teleprompter", title: "Teleprompter take" });
        project.hasOriginal = true;
        project.scriptText = loadTeleprompterScript();
        await putProjectOriginalBlob(project.id, file);
        await saveGigaEditProject(project);
        setStatus("Saved. Tap Post when ready.");
      })().catch(() => setStatus("Could not save this take to Projects."));
    };
    try { recorder.start(); }
    catch { setStatus("Could not start recording. Please try again."); return; }
    setRecording(true);
    setStatus(null);
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }

  async function saveScriptProject() {
    const project = createEmptyProject({ kind: "teleprompter", title: "Teleprompter script" });
    project.scriptText = loadTeleprompterScript();
    await saveGigaEditProject(project);
    setStatus("Script saved.");
  }

  async function postRecording() {
    const file = recordedFileRef.current;
    if (!file) {
      setStatus("Record a take first.");
      return;
    }
    setStatus("Opening GigaSocial…");
    const result = await handoffAndOpenGigaSocial({
      kind: "video",
      edited: file,
      original: file,
      aspectRatio: "9:16",
      destination: "feed",
      caption: "Teleprompter take",
    });
    if (result.error) setStatus(result.error);
    if (result.queued) setStatus("Offline — queued for GigaSocial.");
  }

  function openScriptEditor() {
    window.dispatchEvent(new CustomEvent("giga3:teleprompter-open-settings"));
  }

  function showTeleprompterOverlay() {
    window.dispatchEvent(new CustomEvent("giga3:teleprompter-show-overlay"));
  }

  useEffect(() => {
    if (!cameraOn) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [cameraOn]);

  const scriptPanel = (
    <div className="gigaedit-glass space-y-3 p-4">
      <label className="block text-sm">
        Script
        <textarea value={script} rows={6} onChange={(event) => {
          setScript(event.target.value);
          saveTeleprompterScript(event.target.value);
        }} className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-base" />
      </label>
      <a className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--ge-gold)]" href="/gigaedit/?tab=audio">Generate commentary or voiceover</a>
    </div>
  );

  if (cameraOn && mounted) {
    return createPortal(
      <div className="gigaedit-teleprompter-immersive gigasocial-immersive-capture fixed inset-0 z-[70] flex flex-col bg-black text-white">
        <CameraStylePreview
          kind="video"
          stream={stream}
          videoRef={videoRef}
          muted
          aspectRatioCss="9 / 16"
          look={cameraLook}
          variant="immersive"
          showControls={false}
          showChrome={false}
          ultraClear
          emptyLabel="Starting camera…"
          className="min-h-0 flex-1"
          overlay={
            <>
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/30 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent"
                aria-hidden
              />
              <GigaSocialTeleprompter
                active
                recording={recording}
                presentation="studio"
                defaultSettingsOpen={false}
                className="pointer-events-none absolute inset-0"
              />
            </>
          }
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[25] flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white"
            onClick={disableCamera}
            aria-label="Close teleprompter"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white"
            onClick={() => {
              showTeleprompterOverlay();
              openScriptEditor();
            }}
          >
            Script
          </button>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6"
          ref={recordControlsRef}
        >
          {status ? (
            <p className="pointer-events-none text-center text-[11px] text-white/80">{status}</p>
          ) : null}

          <div className="pointer-events-auto flex justify-center">
            <button
              type="button"
              className="gigaedit-teleprompter-shutter flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full transition active:scale-95"
              onClick={() => (recording ? stopRecording() : startRecording())}
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              {recording ? (
                <Square className="h-6 w-6 fill-white text-white" aria-hidden />
              ) : (
                <Circle className="h-12 w-12 fill-white/95 text-white/95" aria-hidden />
              )}
            </button>

          </div>

          <div className="pointer-events-auto flex w-full max-w-xs items-center justify-between pt-1">
            <button
              type="button"
              className="rounded-full bg-black/40 px-3 py-2 text-[11px] font-medium text-white/90"
              onClick={() => void saveScriptProject().catch(() => setStatus("Could not save the script."))}
            >
              Save script
            </button>
            <button
              type="button"
              className="rounded-full bg-[var(--ge-gold,#f5d76e)] px-3 py-2 text-[11px] font-bold text-[#0b1220] disabled:opacity-40"
              disabled={!hasRecording}
              onClick={() => void postRecording()}
            >
              Post
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Teleprompter</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          Edit your script, then open the camera when you’re ready to record.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={cameraLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--ge-gold)] px-4 py-2.5 text-sm font-bold text-[#0b1220] disabled:opacity-60"
          onClick={() => void enableCamera()}
        >
          {cameraLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {cameraLoading ? "Opening camera…" : "Open fullscreen camera"}
        </button>
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
          onClick={() => void saveScriptProject().catch(() => setStatus("Could not save the script."))}
        >
          Save script draft
        </button>
      </div>

      {scriptPanel}
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}
