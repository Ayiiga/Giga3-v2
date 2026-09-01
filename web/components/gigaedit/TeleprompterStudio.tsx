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
import { Loader2, X } from "lucide-react";
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
  autoOpenCamera = true,
}: TeleprompterStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoOpenAttemptedRef = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [prompterKey, setPrompterKey] = useState(0);
  const [cameraLook, setCameraLook] = useState<CameraLookOptions>({
    ...DEFAULT_CAMERA_LOOK,
    adaptiveBrightness: true,
    autoExposure: true,
    autofocus: true,
    naturalColors: true,
  });
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

  const enableCamera = useCallback(async () => {
    if (cameraLoading || cameraOn) return;
    setCameraLoading(true);
    setStatus("Requesting camera and microphone…");
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
          ? `Fullscreen camera ready (${applied.join(", ")}). Tap Edit to change your script.`
          : "Fullscreen camera ready. Edit your script, then tap Record."
      );
    } catch {
      setStatus("Camera/microphone permission denied or unavailable. Allow access and tap Open camera.");
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
    autoOpenAttemptedRef.current = false;
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
    setStatus("Recording — script auto-scrolls. Tap Edit anytime to adjust text.");
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
      setStatus("Voice-follow off. Script uses auto-scroll speed.");
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
      setStatus("Voice-follow needs browser SpeechRecognition. Auto-scroll still works.");
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
        setStatus("Voice-follow stopped. Continue with auto-scroll.");
      };
      recognition.start();
      recognitionRef.current = recognition;
      setVoiceFollow(true);
      setStatus("Voice-follow on — your speech advances the script.");
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

  const scriptPanel = (
    <div className="gigaedit-glass space-y-3 p-4">
      <label className="block text-xs text-[var(--ge-muted)]">
        Script topic (offline AI template)
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
          setStatus("Script generated — edit it in the teleprompter panel.");
        }}
      >
        Generate script
      </button>
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
          emptyLabel="Starting camera…"
          className="min-h-0 flex-1"
          overlay={
            <GigaSocialTeleprompter
              key={prompterKey}
              active
              recording={recording}
              presentation="studio"
              defaultSettingsOpen
              className="pointer-events-none absolute inset-0"
            />
          }
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-2 text-xs backdrop-blur-sm"
            onClick={disableCamera}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Close
          </button>
          <p className="text-xs font-semibold tracking-wide text-white/95">Teleprompter · fullscreen</p>
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-black/50 px-3 py-2 text-xs backdrop-blur-sm"
            onClick={() => setShowScriptPanel((v) => !v)}
          >
            Topic
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
          {!recording ? (
            <div className="pointer-events-auto">
              <PreSnapEditBar
                filterId={filterId}
                onFilterChange={setFilterId}
                modeId={captureModeId}
                onModeChange={setCaptureModeId}
              />
            </div>
          ) : null}
          <div className="pointer-events-auto flex flex-wrap gap-2" ref={recordControlsRef}>
            <button
              type="button"
              className={cnRecordButton(recording)}
              onClick={() => (recording ? stopRecording() : startRecording())}
            >
              {recording ? "Stop" : "Record"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-medium"
              onClick={() => void saveScriptProject()}
            >
              Save script
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-medium"
              onClick={toggleVoiceFollow}
            >
              {voiceFollow ? "Voice on" : "Voice-follow"}
            </button>
            <button
              type="button"
              className="rounded-xl bg-[var(--ge-gold,#f5d76e)] px-3 py-2 text-xs font-bold text-[#0b1220]"
              onClick={() => void postRecording()}
            >
              Post
            </button>
          </div>
          {showScriptPanel ? (
            <div className="pointer-events-auto max-h-40 overflow-y-auto">{scriptPanel}</div>
          ) : null}
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
          Full-screen camera with a bright editable script, auto-scroll, and optional voice-follow.
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
          onClick={() => void saveScriptProject()}
        >
          Save script draft
        </button>
      </div>

      {scriptPanel}
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}

function cnRecordButton(recording: boolean): string {
  return recording
    ? "rounded-xl border border-red-400/60 bg-red-500/90 px-4 py-2 text-xs font-bold text-white"
    : "rounded-xl border border-white/30 bg-white px-4 py-2 text-xs font-bold text-[#0b1220]";
}
