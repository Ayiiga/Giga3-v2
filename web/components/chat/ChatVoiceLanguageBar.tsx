"use client";

import { AFRICAN_READER_VOICES } from "@/components/chat/AfricanVoiceReader";
import {
  readVoiceLanguageId,
  subscribeVoiceLanguageId,
  writeVoiceLanguageId,
} from "@/lib/chat/voiceLanguagePreference";
import { cn } from "@/lib/utils";
import { ChevronDown, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

type ChatVoiceLanguageBarProps = {
  className?: string;
};

/** Mobile pill selector — matches app mockup below chat header. */
export function ChatVoiceLanguageBar({ className }: ChatVoiceLanguageBarProps) {
  const [voiceId, setVoiceId] = useState(readVoiceLanguageId);
  const active =
    AFRICAN_READER_VOICES.find((voice) => voice.id === voiceId) ??
    AFRICAN_READER_VOICES[0];

  useEffect(() => subscribeVoiceLanguageId(setVoiceId), []);

  return (
    <div className={cn("chat-voice-language-bar", className)}>
      <label className="chat-voice-language-pill">
        <Volume2 className="chat-voice-language-pill__icon" aria-hidden />
        <span className="chat-voice-language-pill__prefix">Voice Language:</span>
        <span className="chat-voice-language-pill__value" aria-hidden>
          {active.name} {active.flag}
        </span>
        <select
          className="chat-voice-language-pill__select"
          value={voiceId}
          aria-label="Voice language"
          onChange={(event) => {
            const next = event.target.value;
            writeVoiceLanguageId(next);
            setVoiceId(next);
          }}
        >
          {AFRICAN_READER_VOICES.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name} {voice.flag}
            </option>
          ))}
        </select>
        <ChevronDown className="chat-voice-language-pill__chevron" aria-hidden />
      </label>
    </div>
  );
}
