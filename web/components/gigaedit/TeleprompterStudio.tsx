"use client";

import { CameraStylePreview } from "@/components/gigaedit/CameraStylePreview";
import { PreSnapEditBar } from "@/components/gigasocial/studio/PreSnapEditBar";
import { GigaSocialTeleprompter } from "@/components/gigasocial/studio/GigaSocialTeleprompter";
import {
  DEFAULT_CAMERA_LOOK,
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
import {
  getCameraFilterCss,
  type CameraFilterId,
} from "@/lib/gigasocial/cameraFilters";
import type { CameraCaptureModeId } from "@/lib/gigasocial/cameraModes";
import { generateTeleprompterScript, loadTeleprompterScript } from "@/lib/gigasocial/teleprompterScripts";
import { Camera, CameraOff, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TeleprompterStudioProps = {
  /** Scroll to record controls (Creator Home → Record Video). */
  focusRecord?: boolean;
};

export function TeleprompterStudio({ focusRecord = false }: TeleprompterStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [prompterKey, setPrompterKey] = useState(0);
  const [cameraLook, setCameraLook] = useState<CameraLookOptions>(DEFAULT_CAMERA_LOOK);
  const [voiceFollow, setVoiceFollow] = useState(false);
  const [filterId, setFilterId] = useState<CameraFilterId>("none");
  const [captureModeId, setCaptureModeId] = useState<CameraCaptureModeId>("standard");
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedFileRef = useRef<File | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const recordControlsRef = useRef<HTMLDivElement>(null);
  const tier = useMemo(() => detectDeviceTier(), []);

  useEffect(() => {
    setMounted(true);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!focusRecord) return;
    setStatus("Script ready? Tap Record when you're set — camera permission may be required.");
    recordControlsRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
  }, [focusRecord]);

  async function enableCamera() {
    try {
      const constraints = buildProCameraConstraints({
        facingMode: "user",
        look: cameraLook,
        tier,
      });
      const next = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = next;
      setStream(next);
      const applied = await applyCameraTrackEnhancements(next, cameraLook);
      setCameraOn(true);
      setStatus(
        applied.length
          ? `Camera ready with ${applied.join(", ")} (permission granted).`
          : "Camera & mic enabled with your permission. Pro enhancements use best-effort device support."
      );
    } catch {
      setStatus("Camera/microphone permission denied or unavailable.");
    }
  }

  function disableCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setRecording(false);
  }

  function startRecording() {
    const active = streamRef.current;
    if (!active) {
      setStatus("Enable the camera first.");
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(active);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      const file = new File([blob], `gigaedit-teleprompter-${Date.now()}.webm`, {
        type: blob.type || "video/webm",
      });
      recordedFileRef.current = file;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      void (async () => {
        const project = createEmptyProject({ kind: "teleprompter", title: "Teleprompter take" });
        project.hasOriginal = true;
        project.scriptText = loadTeleprompterScript();
        await saveGigaEditProject(project);
        await putProjectOriginalBlob(project.id, file);
        setStatus("Recording saved locally. Use Post to GigaSocial when ready.");
      })();
    };
    recorder.start();
    setRecording(true);
    setStatus("Recording… teleprompter stays offline-capable.");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function saveScriptProject() {
    const project = createEmptyProject({ kind: "teleprompter", title: "Teleprompter script" });
    project.scriptText = loadTeleprompterScript();
    project.aiAssisted = Boolean(topic.trim());
    await saveGigaEditProject(project);
    setStatus("Script draft saved locally for offline use.");
  }

  async function postRecording() {
    const file = recordedFileRef.current;
    if (!file) {
      setStatus("Record a take first, then post to GigaSocial.");
      return;
    }
    setStatus("Opening GigaSocial…");
    const result = await handoffAndOpenGigaSocial({
      kind: "video",
      edited: file,
      original: file,
      aspectRatio: "9:16",
      destination: "feed",
      caption: topic.trim() || "Teleprompter take",
      aiAssisted: Boolean(topic.trim()),
    });
    if (result.error) setStatus(result.error);
    if (result.queued) setStatus("Offline — recording queued for GigaSocial.");
  }

  function toggleVoiceFollow() {
    if (voiceFollow) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setVoiceFollow(false);
      setStatus("Voice-follow off. Use teleprompter speed controls to scroll.");
      return;
    }
    const w = window as Window & Record<string, unknown>;
    const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as
      | (new () => {
          continuous: boolean;
          interimResults: boolean;
          onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        })
      | undefined;
    if (!Ctor) {
      setStatus("Voice-follow needs browser SpeechRecognition. Scroll manually via teleprompter settings.");
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = () => {
        window.dispatchEvent(new CustomEvent("giga3:teleprompter-voice-tick"));
      };
      recognition.onerror = () => {
        setVoiceFollow(false);
        setStatus("Voice-follow stopped. Continue with manual scroll.");
      };
      recognition.start();
      recognitionRef.current = recognition;
      setVoiceFollow(true);
      setStatus("Voice-follow on — speech advances the teleprompter when the browser supports it.");
    } catch {
      setStatus("Could not start voice-follow on this device.");
    }
  }

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!cameraOn) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [cameraOn]);

  const filterCss = getCameraFilterCss(filterId);

  const setupPanel = (
    <div className="gigaedit-glass space-y-3 p-4">
      <label className="block text-xs text-[var(--ge-muted)]">
        AI script topic (offline template)
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-sm"
          placeholder="e.g. creator tips for Ghana"
        />
      </label>
      <button
        type="button"
        className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
        onClick={() => {
          const script = generateTeleprompterScript(topic);
          try {
            localStorage.setItem("giga3_gigasocial_teleprompter_script", script);
          } catch {
            /* ignore */
          }
          setPrompterKey((k) => k + 1);
          setStatus("AI-assisted script generated offline and loaded into the teleprompter.");
        }}
      >
        Generate AI script
      </button>
      <p className="text-[11px] text-[var(--ge-muted)]">
        Voice-follow uses browser SpeechRecognition when available. Speed and mirror controls are in
        the teleprompter settings gear. Recordings save locally and can post to GigaSocial.
      </p>
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
          onLookChange={setCameraLook}
          variant="immersive"
          showControls={false}
          baseFilterCss={filterCss}
          emptyLabel="Enable the camera for a full-screen teleprompter preview."
          className="min-h-0 flex-1"
          overlay={
            <div className="absolute inset-x-2 bottom-36 top-1/3 pointer-events-auto">
              <GigaSocialTeleprompter
                key={prompterKey}
                active
                recording={recording}
                className="h-full"
              />
            </div>
          }
        />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-black/45 px-3 py-2 text-xs"
            onClick={disableCamera}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Close
          </button>
          <p className="text-xs font-semibold tracking-wide">Teleprompter · fullscreen</p>
          <button
            type="button"
            className="rounded-full bg-black/45 px-3 py-2 text-xs"
            onClick={() => setShowScriptPanel((v) => !v)}
          >
            Script
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
          {!recording ? (
            <PreSnapEditBar
              filterId={filterId}
              onFilterChange={setFilterId}
              modeId={captureModeId}
              onModeChange={setCaptureModeId}
            />
          ) : null}
          <div className="flex flex-wrap gap-2" ref={recordControlsRef}>
            <button
              type="button"
              className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs"
              onClick={() => (recording ? stopRecording() : startRecording())}
            >
              {recording ? "Stop recording" : "Record"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs"
              onClick={() => void saveScriptProject()}
            >
              Save script
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs"
              onClick={toggleVoiceFollow}
            >
              {voiceFollow ? "Voice-follow on" : "Voice-follow"}
            </button>
            <button
              type="button"
              className="rounded-xl bg-[var(--ge-gold,#f5d76e)] px-3 py-2 text-xs font-bold text-[#0b1220]"
              onClick={() => void postRecording()}
            >
              Post to GigaSocial
            </button>
          </div>
          {showScriptPanel ? <div className="max-h-40 overflow-y-auto">{setupPanel}</div> : null}
          {status ? <p className="text-xs text-[var(--ge-gold,#f5d76e)]">{status}</p> : null}
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
          Full-screen camera with pre-snap looks, autofocus/exposure when supported, and offline
          scripts ({tier}-tier).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220]"
          onClick={() => void enableCamera()}
        >
          <Camera className="h-3.5 w-3.5" aria-hidden />
          Open fullscreen camera
        </button>
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
          onClick={() => void saveScriptProject()}
        >
          Save script draft
        </button>
        <button
          type="button"
          className="rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220]"
          onClick={() => void postRecording()}
        >
          Post to GigaSocial
        </button>
      </div>

      {setupPanel}
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
      <p className="inline-flex items-center gap-1 text-[11px] text-[var(--ge-muted)]">
        <CameraOff className="h-3.5 w-3.5" aria-hidden />
        Camera stays off until you open the fullscreen teleprompter.
      </p>
    </div>
  );
}
