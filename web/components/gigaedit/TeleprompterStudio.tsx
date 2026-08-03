"use client";

import { CameraStylePreview } from "@/components/gigaedit/CameraStylePreview";
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
  saveGigaEditProject,
} from "@/lib/gigaedit/projects";
import { generateTeleprompterScript, loadTeleprompterScript } from "@/lib/gigasocial/teleprompterScripts";
import { Camera, CameraOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function TeleprompterStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [prompterKey, setPrompterKey] = useState(0);
  const [cameraLook, setCameraLook] = useState<CameraLookOptions>(DEFAULT_CAMERA_LOOK);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tier = useMemo(() => detectDeviceTier(), []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gigaedit-teleprompter-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Recording exported. Original camera stream was not overwritten.");
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Teleprompter</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          Pro camera preview with autofocus, auto exposure, white balance, and stabilization when the
          device supports them — plus offline scripts ({tier}-tier).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {!cameraOn ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220]"
            onClick={() => void enableCamera()}
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Enable camera
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
            onClick={disableCamera}
          >
            <CameraOff className="h-3.5 w-3.5" aria-hidden />
            Turn off camera
          </button>
        )}
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
          onClick={() => (recording ? stopRecording() : startRecording())}
        >
          {recording ? "Stop recording" : "Record"}
        </button>
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
          onClick={() => void saveScriptProject()}
        >
          Save script draft
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="relative">
          <CameraStylePreview
            kind="video"
            stream={stream}
            videoRef={videoRef}
            muted
            aspectRatioCss="9 / 16"
            look={cameraLook}
            onLookChange={setCameraLook}
            emptyLabel="Enable the camera for a pro preview with adaptive look controls."
            overlay={
              <div className="absolute inset-x-2 bottom-2 top-1/3">
                <GigaSocialTeleprompter
                  key={prompterKey}
                  active
                  recording={recording}
                  className="h-full"
                />
              </div>
            }
          />
        </div>
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
            Voice-follow scrolling can use the browser SpeechRecognition API when available; speed and
            mirror controls are in the teleprompter settings gear. Recording never overwrites the live
            stream.
          </p>
        </div>
      </div>
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}
