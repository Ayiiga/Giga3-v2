/**
 * Play African speech from the Giga3 server. English profiles do not use this.
 * The subscription key never leaves the server.
 */

import { chunkSpeechText } from "@/lib/speech/chunkSpeechText";
import { khayaSpeechForProfile } from "../../../convex/khaya/languages";
import { requestGiga3AfricanSpeech } from "@/lib/voice/giga3SpeechClient";
import { GIGA3_AFRICAN_VOICE_MODEL } from "@/lib/voice/africanVoiceTypes";

let activeAudio: HTMLAudioElement | null = null;
let playbackToken = 0;

export function cancelKhayaPlayback(): void {
  playbackToken += 1;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
}

function playWav(bytes: ArrayBuffer, token: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (token !== playbackToken) {
      resolve(false);
      return;
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
    const audio = new Audio(url);
    activeAudio = audio;
    const finish = (ok: boolean) => {
      URL.revokeObjectURL(url);
      if (activeAudio === audio) activeAudio = null;
      resolve(ok && token === playbackToken);
    };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    void audio.play().then(
      () => undefined,
      () => finish(false)
    );
  });
}

/** Returns true when Khaya audio finished. False means playback did not succeed. */
export async function playKhayaVoice(args: {
  text: string;
  voiceId?: string;
  isActive: () => boolean;
  onStart?: () => void;
}): Promise<boolean> {
  const profile = khayaSpeechForProfile(args.voiceId);
  if (!profile) return false;
  const chunks = chunkSpeechText(args.text, 900);
  if (chunks.length === 0) return false;
  const token = playbackToken;
  let started = false;
  for (const chunk of chunks) {
    if (!args.isActive() || token !== playbackToken) return false;
    const result = await requestGiga3AfricanSpeech({
      model: GIGA3_AFRICAN_VOICE_MODEL,
      language: profile.language,
      voice: profile.speaker,
      input: chunk,
      response_format: "wav",
    });
    if (!result.ok || !args.isActive() || token !== playbackToken) return false;
    if (!started) {
      started = true;
      args.onStart?.();
    }
    const played = await playWav(result.audio, token);
    if (!played) return false;
  }
  return started;
}
