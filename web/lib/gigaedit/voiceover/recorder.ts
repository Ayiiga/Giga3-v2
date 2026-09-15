/**
 * Voiceover recorder — MediaRecorder on main thread, chunks streamed to OPFS.
 * Direct onClick start only (no auto-record useEffect).
 */

import {
  newVoiceoverSessionId,
  supportsOpfs,
  writeVoiceoverChunk,
  writeVoiceoverMeta,
} from "@/lib/gigaedit/voiceover/opfsStorage";

const PREFERRED_MIME = "audio/webm;codecs=opus";

export type VoiceoverRecorderCallbacks = {
  onWaveform?: (levels: number[]) => void;
  onDuration?: (sec: number) => void;
  onError?: (message: string) => void;
};

export type VoiceoverRecorderState = {
  sessionId: string;
  recording: boolean;
  chunkIndex: number;
  startedAt: number;
};

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported(PREFERRED_MIME)) return PREFERRED_MIME;
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return "";
}

export class VoiceoverRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private analyser: AnalyserNode | null = null;
  private audioCtx: AudioContext | null = null;
  private rafId = 0;
  private chunkIndex = 0;
  private sessionId = "";
  private startedAt = 0;
  private ramChunks: Blob[] = [];
  private callbacks: VoiceoverRecorderCallbacks = {};

  setCallbacks(callbacks: VoiceoverRecorderCallbacks) {
    this.callbacks = callbacks;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  isRecording(): boolean {
    return Boolean(this.recorder && this.recorder.state === "recording");
  }

  async start(): Promise<void> {
    if (this.isRecording()) return;
    if (!supportsOpfs()) {
      this.callbacks.onError?.("OPFS not supported — update Chrome or free storage.");
      return;
    }

    this.sessionId = newVoiceoverSessionId();
    this.chunkIndex = 0;
    this.ramChunks = [];
    this.startedAt = Date.now();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.stream = stream;

    const mimeType = pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64_000 })
      : new MediaRecorder(stream);
    this.recorder = recorder;

    recorder.ondataavailable = (event) => {
      if (!event.data.size) return;
      void this.persistChunk(event.data);
    };

    recorder.onerror = () => {
      this.callbacks.onError?.("Recording failed — try again.");
      void this.stop();
    };

    this.setupWaveform(stream);
    recorder.start(1000);
  }

  private async persistChunk(blob: Blob) {
    const index = this.chunkIndex;
    this.chunkIndex += 1;
    const ok = await writeVoiceoverChunk(this.sessionId, index, blob);
    if (!ok) this.ramChunks.push(blob);
  }

  private setupWaveform(stream: MediaStream) {
    try {
      this.audioCtx = new AudioContext();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      const tick = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(data);
        const levels = Array.from(data.slice(0, 12)).map((v) => v / 255);
        this.callbacks.onWaveform?.(levels);
        const elapsed = (Date.now() - this.startedAt) / 1000;
        this.callbacks.onDuration?.(elapsed);
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    } catch {
      /* waveform optional */
    }
  }

  async stop(): Promise<{ sessionId: string; mimeType: string } | null> {
    const recorder = this.recorder;
    if (!recorder) return null;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      if (recorder.state !== "inactive") recorder.stop();
    });

    cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    if (this.audioCtx) {
      await this.audioCtx.close().catch(() => undefined);
      this.audioCtx = null;
    }

    const mimeType = recorder.mimeType || PREFERRED_MIME;
    await writeVoiceoverMeta(this.sessionId, {
      mimeType,
      chunkCount: this.chunkIndex,
    });

    if (this.ramChunks.length && this.chunkIndex === 0) {
      for (let i = 0; i < this.ramChunks.length; i += 1) {
        await writeVoiceoverChunk(this.sessionId, i, this.ramChunks[i]);
      }
      await writeVoiceoverMeta(this.sessionId, {
        mimeType,
        chunkCount: this.ramChunks.length,
      });
    }

    return { sessionId: this.sessionId, mimeType };
  }
}
