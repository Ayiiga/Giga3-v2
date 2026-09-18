"use client";

import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type AfricanReaderVoice = {
  id: string;
  name: string;
  flag: string;
  lang: string;
};

export const AFRICAN_READER_VOICES: AfricanReaderVoice[] = [
  { id: "abena-twi", name: "Abena Twi", flag: "🇬🇭", lang: "ak-GH" },
  { id: "musa-hausa", name: "Musa Hausa", flag: "🇳🇬", lang: "ha-NG" },
  { id: "naa-ga", name: "Naa Ga", flag: "🇬🇭", lang: "en-GH" },
  { id: "kofi-ewe", name: "Ewe", flag: "🇬🇭", lang: "ee-GH" },
  { id: "ade-yoruba", name: "Yoruba", flag: "🇳🇬", lang: "yo-NG" },
  { id: "zawadi-swahili", name: "Swahili", flag: "🇰🇪", lang: "sw-KE" },
];

/**
 * African voice reader below AI responses — offline on-device speech,
 * defaulting to Twi Female (Ghana, slow and clear for BECE/WASSCE).
 */
export function AfricanVoiceReader({ content }: { content: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceId, setVoiceId] = useState(AFRICAN_READER_VOICES[0].id);
  const [rate, setRate] = useState(1);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }, []);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (!supported || !content.trim()) return null;

  const plainText = content
    .replace(/```[\s\S]*?```/g, " code block omitted. ")
    .replace(/[#*`>|_~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .slice(0, 2000);

  function stop() {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    utterRef.current = null;
    setSpeaking(false);
  }

  function play() {
    if (speaking) {
      stop();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(plainText);
      const voice = AFRICAN_READER_VOICES.find((v) => v.id === voiceId);
      utter.lang = voice?.lang ?? "en-GH";
      utter.rate = rate;
      const systemVoice =
        window.speechSynthesis
          .getVoices()
          .find((v) => v.lang?.toLowerCase().startsWith(utter.lang.slice(0, 2).toLowerCase())) ??
        window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith("en")) ??
        null;
      if (systemVoice) utter.voice = systemVoice;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
      setSpeaking(true);
    } catch {
      setSpeaking(false);
    }
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
      className="mt-2 flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-2.5 py-1.5"
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
              onClick={() => setVoiceId(voice.id)}
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
        <button
          type="button"
          onClick={play}
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
      </div>
      <span className="w-full text-[10px] leading-tight text-gray-400">
        ON DEVICE · free offline · Studio TTS 1 credit / 500 chars
      </span>
    </div>
  );
}
