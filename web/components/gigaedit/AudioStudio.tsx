"use client";

import {
  AFRICAN_VOICES,
  filterVoicesByTab,
  type AfricanVoice,
  type VoiceTab,
  voiceById,
} from "@/lib/gigaedit/africanVoices";
import { createEmptyProject, putProjectOriginalBlob, saveGigaEditProject } from "@/lib/gigaedit/projects";
import {
  isBrowserVoiceoverSupported,
  playVoiceoverPreview,
  stopVoiceoverPreview,
} from "@/lib/media/videoPreProduction/browserVoiceover";
import { loadTeleprompterScript } from "@/lib/gigasocial/teleprompterScripts";
import { Mic, Play, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type AudioStudioProps = {
  focusRecord?: boolean;
  onOpenTeleprompter?: () => void;
};

const VOICE_TABS: { id: VoiceTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "african", label: "African" },
  { id: "english", label: "English" },
  { id: "local", label: "Local" },
];

export function AudioStudio({ focusRecord = false, onOpenTeleprompter }: AudioStudioProps) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceTab, setVoiceTab] = useState<VoiceTab>("african");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(AFRICAN_VOICES[0]?.id ?? null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const voices = filterVoicesByTab(voiceTab);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      stopVoiceoverPreview();
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!focusRecord) return;
    setStatus("Tap Record to capture voiceover — saved as a local audio project.");
  }, [focusRecord]);

  function previewVoice(voice: AfricanVoice) {
    stopVoiceoverPreview();
    setPreviewingId(voice.id);
    const ok = playVoiceoverPreview({
      text: voice.previewText,
      lang: voice.lang,
      rate: voice.rate ?? 1,
      pitch: voice.pitch ?? 1,
      onEnd: () => setPreviewingId(null),
      onError: (msg) => {
        setPreviewingId(null);
        setStatus(msg);
      },
    });
    if (!ok) setPreviewingId(null);
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation,
          noiseSuppression,
          autoGainControl: noiseSuppression,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        void (async () => {
          const voice = selectedVoiceId ? voiceById(selectedVoiceId) : null;
          const project = createEmptyProject({
            kind: "audio",
            title: voice ? `${voice.name} voiceover` : "Audio take",
          });
          project.hasOriginal = true;
          project.scriptText = loadTeleprompterScript();
          await saveGigaEditProject(project);
          await putProjectOriginalBlob(project.id, blob);
          setStatus("Audio saved locally. Open Video editor to attach it.");
        })();
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
      setStatus("Recording… microphone permission granted.");
    } catch {
      setStatus("Microphone permission denied or unavailable.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function openAfricanVoiceover() {
    setVoicePickerOpen(true);
    setStatus("Pick an African voice, then record with the teleprompter script.");
    onOpenTeleprompter?.();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("giga3:teleprompter-show-overlay"));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Audio studio</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          African accents built in — Twi, Hausa, Yoruba, Swahili, and more. Record on device, then
          attach on the video timeline.
        </p>
      </div>

      <section className="gigaedit-glass space-y-3 p-4" aria-labelledby="african-voices-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="african-voices-heading" className="text-sm font-semibold">African voices</h3>
          <div className="flex flex-wrap gap-1">
            {VOICE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`gigaedit-chip px-2 py-1 text-[10px] ${voiceTab === tab.id ? "gigaedit-chip--active" : ""}`}
                onClick={() => setVoiceTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className={`gigaedit-voice-card rounded-xl border p-3 ${
                selectedVoiceId === voice.id
                  ? "border-[#10b981] bg-[#10b981]/10"
                  : "border-[var(--ge-border)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    <span aria-hidden>{voice.flag}</span> {voice.name}
                  </p>
                  <p className="text-[11px] text-[var(--ge-muted)]">
                    {voice.language} · {voice.region}
                  </p>
                  <span
                    className="mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold text-[#0b1220]"
                    style={{ backgroundColor: "#10b981" }}
                  >
                    African accent
                  </span>
                </div>
                <button
                  type="button"
                  className="gigaedit-editor-icon-btn shrink-0"
                  aria-label={`Preview ${voice.name}`}
                  disabled={!isBrowserVoiceoverSupported()}
                  onClick={() => previewVoice(voice)}
                >
                  {previewingId === voice.id ? (
                    <Square className="h-4 w-4" aria-hidden />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
              <button
                type="button"
                className="mt-2 w-full rounded-lg border border-[var(--ge-border)] px-2 py-1.5 text-[10px] font-medium text-[var(--ge-gold)]"
                onClick={() => {
                  setSelectedVoiceId(voice.id);
                  setStatus(`Selected ${voice.name} (${voice.language}).`);
                }}
              >
                Use voice
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="gigaedit-glass flex flex-wrap items-center gap-4 p-4 text-xs">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={noiseSuppression}
            onChange={(e) => setNoiseSuppression(e.target.checked)}
          />
          Noise suppression (street market)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={echoCancellation}
            onChange={(e) => setEchoCancellation(e.target.checked)}
          />
          Echo cancellation
        </label>
      </div>

      <div className="gigaedit-glass flex flex-wrap items-center gap-3 p-4">
        {!recording ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--ge-gold)] px-4 py-2 text-xs font-bold text-[#0b1220]"
            onClick={() => void start()}
          >
            <Mic className="h-4 w-4" aria-hidden />
            Record voice on device
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 px-4 py-2 text-xs text-red-200"
            onClick={stop}
          >
            <Square className="h-4 w-4" aria-hidden />
            Stop
          </button>
        )}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-[#10b981]/50 bg-[#10b981]/10 px-4 py-2 text-xs font-semibold text-[#10b981]"
          onClick={openAfricanVoiceover}
        >
          <Volume2 className="h-4 w-4" aria-hidden />
          Add African voiceover
        </button>
        <a
          href="/gigaedit/?tab=video"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs text-[var(--ge-gold)]"
        >
          Open video editor
        </a>
        {audioUrl ? <audio controls src={audioUrl} className="w-full max-w-md" /> : null}
      </div>

      {voicePickerOpen ? (
        <p className="text-xs text-[var(--ge-gold)]">
          Teleprompter opens with your script — read aloud with{" "}
          {selectedVoiceId ? voiceById(selectedVoiceId)?.name : "your chosen"} voice.
        </p>
      ) : null}

      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}
