"use client";

import {
  AFRICAN_VOICE_TABS,
  getAfricanVoice,
  previewAfricanVoiceOffline,
  voicesForTab,
  type AfricanVoice,
  type AfricanVoiceTab,
} from "@/lib/gigaedit/africanVoices";
import { createEmptyProject, putProjectOriginalBlob, saveGigaEditProject } from "@/lib/gigaedit/projects";
import { Mic, Play, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type AudioStudioProps = {
  focusRecord?: boolean;
  /** Fired when the user picks "Add African Voiceover" — parent opens the voice selector + teleprompter. */
  onAddAfricanVoiceover?: (voice: AfricanVoice) => void;
};

export function AudioStudio({ focusRecord = false, onAddAfricanVoiceover }: AudioStudioProps) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceTab, setVoiceTab] = useState<AfricanVoiceTab>("African");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("twi_female");
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [voiceScript, setVoiceScript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const voices = useMemo(() => voicesForTab(voiceTab), [voiceTab]);
  const selectedVoice = getAfricanVoice(selectedVoiceId);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!focusRecord) return;
    setStatus("Tap Record to capture voiceover — saved as a local audio project.");
  }, [focusRecord]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression,
          echoCancellation,
          autoGainControl: true,
        } as MediaTrackConstraints,
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
          const project = createEmptyProject({ kind: "audio", title: "Audio take" });
          project.hasOriginal = true;
          await saveGigaEditProject(project);
          await putProjectOriginalBlob(project.id, blob);
          setStatus("Audio saved locally. Open Video editor → Use Audio Studio take to attach it.");
        })();
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
      setStatus(
        `Recording…${noiseSuppression ? " street-noise suppression on." : " microphone permission granted."}`
      );
    } catch {
      setStatus("Microphone permission denied or unavailable.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function handleAddAfricanVoiceover(voice: AfricanVoice) {
    setSelectedVoiceId(voice.id);
    const script = voiceScript.trim() || loadTeleprompterScriptFallback();
    setVoiceScript(script);
    setStatus(`“${voice.name}” selected — teleprompter opens with your script.`);
    onAddAfricanVoiceover?.(voice);
    try {
      window.dispatchEvent(
        new CustomEvent("giga3:african-voiceover-selected", { detail: { voiceId: voice.id, script } })
      );
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Audio studio</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          Record voiceovers offline, keep originals, then attach them on the video timeline for
          export mix.
        </p>
      </div>

      {/* ── African voices (top) ─────────────────────────────────────────── */}
      <section aria-labelledby="gigaedit-african-voices" className="gigaedit-glass space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 id="gigaedit-african-voices" className="text-sm font-semibold">
            African voices
          </h3>
          <span className="gigaedit-african-badge">Built in Africa</span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Voice groups">
          {AFRICAN_VOICE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={voiceTab === tab}
              className={`gigaedit-chip px-2.5 py-1 text-[11px] ${voiceTab === tab ? "gigaedit-chip--active" : ""}`}
              onClick={() => setVoiceTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {voices.map((voice) => {
            const selected = voice.id === selectedVoiceId;
            return (
              <li
                key={voice.id}
                className={`gigaedit-voice-card ${selected ? "gigaedit-voice-card--selected" : ""}`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setSelectedVoiceId(voice.id)}
                  aria-pressed={selected}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-lg" aria-hidden>
                      {voice.flag}
                    </span>
                    <span className="truncate text-xs font-semibold text-white">{voice.name}</span>
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[var(--ge-muted)]">
                    {voice.language} · {voice.region}
                    {voice.creditCostGhs > 0 ? ` · GH₵${voice.creditCostGhs.toFixed(2)}/clip` : " · offline free"}
                  </span>
                  {voice.africanAccent ? (
                    <span className="gigaedit-voice-accent-badge">African accent</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="gigaedit-voice-sample-btn"
                  aria-label={`Play sample of ${voice.name}`}
                  onClick={() => previewAfricanVoiceOffline(voice)}
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>

        <label className="block text-xs text-[var(--ge-muted)]">
          Voiceover script (teleprompter opens with this)
          <textarea
            value={voiceScript}
            onChange={(e) => setVoiceScript(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-2.5 py-1.5 text-sm text-white"
            placeholder="Type the lines your African voiceover will read…"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--ge-gold)] px-4 py-2 text-xs font-bold text-[#0b1220]"
            onClick={() => selectedVoice && handleAddAfricanVoiceover(selectedVoice)}
          >
            <Mic className="h-4 w-4" aria-hidden />
            Add African Voiceover{selectedVoice ? ` · ${selectedVoice.name}` : ""}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2.5 text-xs text-white">
            <span>Noise suppression (street / market)</span>
            <input
              type="checkbox"
              checked={noiseSuppression}
              onChange={(e) => setNoiseSuppression(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2.5 text-xs text-white">
            <span>Echo cancellation</span>
            <input
              type="checkbox"
              checked={echoCancellation}
              onChange={(e) => setEchoCancellation(e.target.checked)}
            />
          </label>
        </div>
      </section>

      {/* ── On-device recording ──────────────────────────────────────────── */}
      <div className="gigaedit-glass flex flex-wrap items-center gap-3 p-4">
        {!recording ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--ge-gold)] px-4 py-2 text-xs font-bold text-[#0b1220]"
            onClick={() => void start()}
            title="ON DEVICE = offline, free, no credits"
          >
            <Mic className="h-4 w-4" aria-hidden />
            Record Voice ON DEVICE
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
        <a
          href="/gigaedit/?tab=video"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs text-[var(--ge-gold)]"
        >
          Open video editor
        </a>
        {audioUrl ? <audio controls src={audioUrl} className="w-full max-w-md" /> : null}
      </div>
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}

function loadTeleprompterScriptFallback(): string {
  try {
    return localStorage.getItem("giga3_gigasocial_teleprompter_script") ?? "";
  } catch {
    return "";
  }
}
