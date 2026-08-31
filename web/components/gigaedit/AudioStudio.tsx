"use client";

import { createEmptyProject, putProjectOriginalBlob, saveGigaEditProject } from "@/lib/gigaedit/projects";
import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type AudioStudioProps = {
  focusRecord?: boolean;
};

export function AudioStudio({ focusRecord = false }: AudioStudioProps) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      setStatus("Recording… microphone permission granted.");
    } catch {
      setStatus("Microphone permission denied or unavailable.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
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
      <div className="gigaedit-glass flex flex-wrap items-center gap-3 p-4">
        {!recording ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--ge-gold)] px-4 py-2 text-xs font-bold text-[#0b1220]"
            onClick={() => void start()}
          >
            <Mic className="h-4 w-4" aria-hidden />
            Record audio
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
