"use client";

import { useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { getSessionToken } from "@/lib/auth";
import { createEmptyProject, putProjectOriginalBlob, saveGigaEditProject } from "@/lib/gigaedit/projects";
import { loadTeleprompterScript, saveTeleprompterScript } from "@/lib/gigasocial/teleprompterScripts";
import { GIGA3_AFRICAN_VOICE_MODEL } from "@/lib/voice/africanVoiceTypes";
import { requestGiga3AfricanSpeech } from "@/lib/voice/giga3SpeechClient";
import { useEffect, useRef, useState } from "react";

const VOICES = [
  { name: "Abena · Twi", language: "twi", voice: "female" },
  { name: "Kwame · Twi", language: "twi", voice: "male_low" },
  { name: "Kofi · Ewe", language: "ewe", voice: "male_low" },
] as const;
const MAX_VOICEOVER_LENGTH = 900;

export function AudioStudio({ focusRecord = false }: { focusRecord?: boolean }) {
  const generateScript = useAction(api.mediaVideoScript.generateVideoScript);
  const [topic, setTopic] = useState("");
  const [scriptLanguage, setScriptLanguage] = useState("English");
  const [script, setScript] = useState("");
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [audio, setAudio] = useState<{ url: string; filename: string } | null>(null);
  const audioUrl = useRef<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(false);
  const requestPending = useRef(false);
  const recordButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    mounted.current = true;
    setScript(loadTeleprompterScript());
    return () => {
      mounted.current = false;
      if (recorder.current) recorder.current.onstop = null;
      stream.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);

  useEffect(() => {
    if (focusRecord) recordButton.current?.scrollIntoView({ block: "nearest" });
  }, [focusRecord]);

  async function run(operation: () => Promise<void>) {
    if (requestPending.current || recording) return;
    requestPending.current = true;
    setBusy(true);
    setStatus("");
    try { await operation(); }
    catch (error) {
      if (mounted.current) setStatus(error instanceof Error ? error.message : "Please try again.");
    } finally {
      requestPending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function saveAudio(blob: Blob, filename: string, title: string) {
    if (!mounted.current || !blob.size) return;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    const url = URL.createObjectURL(blob);
    audioUrl.current = url;
    setAudio({ url, filename });
    const project = createEmptyProject({ kind: "audio", title });
    await putProjectOriginalBlob(project.id, blob);
    await saveGigaEditProject({ ...project, hasOriginal: true });
    if (mounted.current) setStatus("Audio saved to Projects.");
  }

  function writeCommentary() {
    void run(async () => {
      const sessionToken = getSessionToken();
      if (!sessionToken) throw new Error("Sign in to generate commentary.");
      const result = await generateScript({
        sessionToken,
        idea: `Language: ${scriptLanguage}\nTopic: ${topic.trim()}`,
        format: "commentary",
        clientRequestId: crypto.randomUUID(),
      });
      if (mounted.current) setScript(result.script);
    });
  }

  function synthesize() {
    void run(async () => {
      const { language, voice } = VOICES[voiceIndex];
      const response = await requestGiga3AfricanSpeech({
        model: GIGA3_AFRICAN_VOICE_MODEL, language, voice, input: script.trim(), response_format: "wav",
      });
      if (!response.ok) throw new Error(response.error);
      await saveAudio(new Blob([response.audio], { type: response.contentType }), "voiceover.wav", "Generated voiceover");
    });
  }

  function record() {
    void run(async () => {
      if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Voice recording is unavailable on this device.");
      }
      const activeStream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      });
      if (!mounted.current) {
        activeStream.getTracks().forEach((track) => track.stop());
        return;
      }
      const chunks: Blob[] = [];
      try {
        const active = new MediaRecorder(activeStream);
        recorder.current = active;
        stream.current = activeStream;
        active.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
        active.onstop = () => {
          activeStream.getTracks().forEach((track) => track.stop());
          stream.current = null;
          recorder.current = null;
          setRecording(false);
          const mime = active.mimeType || chunks[0]?.type || "audio/webm";
          const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
          const blob = new Blob(chunks, { type: mime });
          if (!blob.size) { setStatus("No audio was captured. Please record again."); return; }
          void saveAudio(blob, `voice-take.${extension}`, "Voice take").catch(() => {
            setStatus("Could not save to Projects. You can still download the take here.");
          });
        };
        active.start();
        setRecording(true);
        setStatus("Recording…");
      } catch (error) {
        activeStream.getTracks().forEach((track) => track.stop());
        throw error;
      }
    });
  }

  const field = "mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-sm text-white";
  const action = "inline-flex min-h-11 items-center rounded-xl border border-[var(--ge-border)] px-3 text-sm font-semibold text-white disabled:opacity-50";
  const locked = busy || recording;
  return (
    <div className="space-y-4 text-white">
      <section className="gigaedit-glass space-y-3 p-4">
        <h2 className="text-lg font-semibold">Voiceover & commentary</h2>
        <label className="block text-sm">Commentary topic
          <input className={field} value={topic} maxLength={1000} disabled={locked} onChange={(event) => setTopic(event.target.value)} />
        </label>
        <label className="block text-sm">Commentary language
          <select className={field} value={scriptLanguage} disabled={locked} onChange={(event) => setScriptLanguage(event.target.value)}>
            <option>English</option><option>Twi</option><option>Ewe</option>
          </select>
        </label>
        <button type="button" className={action} disabled={locked || !topic.trim()} onClick={writeCommentary}>Generate commentary · 2 credits</button>
        <label className="block text-sm">Script
          <textarea className={field} rows={5} value={script} disabled={locked} onChange={(event) => setScript(event.target.value)} />
        </label>
        <label className="block text-sm">Generated voice
          <select className={field} value={voiceIndex} disabled={locked} onChange={(event) => setVoiceIndex(Number(event.target.value))}>
            {VOICES.map((voice, index) => <option key={voice.name} value={index}>{voice.name}</option>)}
          </select>
        </label>
        <p className="text-xs text-[var(--ge-muted)]">Use Twi or Ewe text to match your selected voice. Audio generation supports up to {MAX_VOICEOVER_LENGTH} characters per take.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={action} disabled={locked || !script.trim() || script.trim().length > MAX_VOICEOVER_LENGTH} onClick={synthesize}>Generate voiceover</button>
          {script.trim() && !locked && <a href="/gigaedit/?tab=teleprompter" className={action} onClick={() => saveTeleprompterScript(script)}>Open in teleprompter</a>}
        </div>
      </section>
      <section className="gigaedit-glass space-y-3 p-4">
        <h3 className="font-semibold">Record your own voice</h3>
        <button ref={recordButton} type="button" className={action} disabled={busy} onClick={recording ? () => {
          if (recorder.current?.state === "recording") recorder.current.stop();
        } : record}>{recording ? "Stop recording" : "Record voice"}</button>
      </section>
      {busy || status ? <p role="status" className="text-sm text-[var(--ge-gold)]">{busy ? "Working…" : status}</p> : null}
      {audio && <div className="space-y-2">
        <audio controls src={audio.url} className="w-full max-w-md" />
        <a href={audio.url} download={audio.filename} className={action}>Download audio</a>
      </div>}
    </div>
  );
}
