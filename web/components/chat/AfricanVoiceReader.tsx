"use client";

import {
  GIGA_CHAT_VOICES,
  isGigaVoiceSpeaking,
  isGigaVoiceSupported,
  stopGigaVoice,
  toggleGigaVoiceBlock,
} from "@/lib/chat/gigaVoice";
import {
  readVoiceLanguageId,
  subscribeVoiceLanguageId,
  writeVoiceLanguageId,
} from "@/lib/chat/voiceLanguagePreference";
import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

export type AfricanReaderVoice = {
  id: string;
  name: string;
  flag: string;
  lang: string;
};

export const AFRICAN_READER_VOICES: AfricanReaderVoice[] = GIGA_CHAT_VOICES;

type AfricanVoiceReaderProps = {
  content: string;
  /** Stable id for per-message read-aloud toggle (prevents cross-bubble conflicts). */
  messageId?: string;
  /** Voice/rate controls only — no full-message play/download (structured answer blocks). */
  selectorOnly?: boolean;
};

/**
 * African voice reader below AI responses — offline on-device speech,
 * defaulting to English (British); African languages available as secondary options.
 */
export function AfricanVoiceReader({
  content,
  messageId,
  selectorOnly = false,
}: AfricanVoiceReaderProps) {
  const blockId = messageId ? `african-reader-${messageId}` : "african-voice-reader-global";
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceId, setVoiceId] = useState(() => readVoiceLanguageId());
  const [rate, setRate] = useState(1);

  useEffect(() => {
    setSupported(isGigaVoiceSupported());
  }, []);

  useEffect(() => subscribeVoiceLanguageId(setVoiceId), []);

  useEffect(() => {
    return () => {
      stopGigaVoice();
    };
  }, []);

  useEffect(() => {
    if (!speaking) return;
    const id = window.setInterval(() => {
      if (!isGigaVoiceSpeaking()) setSpeaking(false);
    }, 300);
    return () => window.clearInterval(id);
  }, [speaking]);

  if (!supported || (!selectorOnly && !content.trim())) return null;

  async function play() {
    if (speaking) {
      stopGigaVoice();
      setSpeaking(false);
      return;
    }
    const started = await toggleGigaVoiceBlock({
      blockId,
      text: content,
      voiceId,
      rate,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
    if (!started && !isGigaVoiceSpeaking()) setSpeaking(false);
  }

  function download() {
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "giga3-response.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={cn(
        "mt-2 min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-2.5 py-1.5",
        selectorOnly ? "flex" : "hidden md:flex"
      )}
      aria-label="Read with African voice"
    >
      <span className="text-[13px] font-medium text-gray-600" aria-hidden>
        🔊
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5" role="group" aria-label="African voices">
        {AFRICAN_READER_VOICES.map((voice) => {
          const active = voice.id === voiceId;
          return (
            <button
              key={voice.id}
              type="button"
              onClick={() => {
                setVoiceId(voice.id);
                writeVoiceLanguageId(voice.id);
              }}
              aria-pressed={active}
              title={`${voice.name} ${voice.flag}`}
              className={cn(
                "min-h-9 rounded-full px-2.5 py-1 text-[12px] font-medium",
                active
                  ? "bg-[#EAB308] font-bold text-black"
                  : "bg-[#F3F4F6] text-gray-600 hover:bg-[#EAB308]/20"
              )}
            >
              {voice.name} {voice.flag}
            </button>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => setRate((r) => (r >= 1.5 ? 0.75 : Number((r + 0.25).toFixed(2))))}
          className="min-h-9 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[12px] font-medium text-gray-600"
          aria-label={`Speech speed ${rate}x, tap to change`}
          title="Speech speed"
        >
          {rate}x
        </button>
        {!selectorOnly ? (
          <>
            <button
              type="button"
              onClick={() => void play()}
              aria-label={speaking ? "Stop reading response" : "Read response with African voice"}
              aria-pressed={speaking}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#EAB308] text-black shadow-sm hover:bg-[#d4a017]"
            >
              {speaking ? (
                <Pause className="h-4 w-4" aria-hidden />
              ) : (
                <Play className="ml-0.5 h-4 w-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={download}
              className="min-h-9 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[12px] font-medium text-gray-600"
              aria-label="Download response as text"
              title="Download response"
            >
              ↓
            </button>
          </>
        ) : null}
      </div>
      <span className="w-full text-[10px] leading-tight text-gray-400">
        ON DEVICE · free offline · Studio TTS 1 credit / 500 chars
      </span>
    </div>
  );
}
