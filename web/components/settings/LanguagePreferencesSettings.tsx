"use client";

import { GIGA_CHAT_VOICES } from "@/lib/speech/gigaVoiceProfiles";
import {
  RESPONSE_LANGUAGE_OPTIONS,
  readResponseLanguage,
  writeResponseLanguage,
  type ResponseLanguageId,
} from "@/lib/i18n/languagePreferences";
import {
  readVoiceLanguageId,
  subscribeVoiceLanguageId,
  writeVoiceLanguageId,
} from "@/lib/chat/voiceLanguagePreference";
import { useEffect, useState } from "react";

export function LanguagePreferencesSettings() {
  const [language, setLanguage] = useState<ResponseLanguageId>("english");
  const [voiceId, setVoiceId] = useState(() =>
    typeof window === "undefined" ? "english-british" : readVoiceLanguageId()
  );

  useEffect(() => {
    setLanguage(readResponseLanguage());
  }, []);

  useEffect(() => subscribeVoiceLanguageId(setVoiceId), []);

  function select(next: ResponseLanguageId) {
    setLanguage(next);
    writeResponseLanguage(next);
  }

  function selectVoice(next: string) {
    setVoiceId(next);
    writeVoiceLanguageId(next);
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Read-aloud voice</h2>
        <p className="mt-1 text-xs text-muted">
          Choose the voice used when you tap Read aloud on chat messages. Voice
          selection is only available here — not in the chat thread.
        </p>
        <div className="mt-3 space-y-2">
          {GIGA_CHAT_VOICES.map((voice) => {
            const selected = voice.id === voiceId;
            return (
              <label
                key={voice.id}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-2.5 has-[:checked]:border-accent/40 has-[:checked]:bg-accent/5"
              >
                <input
                  type="radio"
                  name="read-aloud-voice"
                  className="mt-1"
                  checked={selected}
                  onChange={() => selectVoice(voice.id)}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {voice.name} {voice.flag}
                  </span>
                  <span className="block text-xs text-muted">{voice.lang}</span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          On-device read-aloud is free offline. Studio TTS uses 1 credit / 500 chars when
          selected elsewhere.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Response language</h2>
        <p className="mt-1 text-xs text-muted">
          Prefer Twi or Ewe via Khaya read-aloud where configured. Full UI translation is not
          automatic.
        </p>
        <div className="mt-3 space-y-2">
          {RESPONSE_LANGUAGE_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-2.5 has-[:checked]:border-accent/40 has-[:checked]:bg-accent/5"
            >
              <input
                type="radio"
                name="response-language"
                className="mt-1"
                checked={language === option.id}
                onChange={() => select(option.id)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="block text-xs text-muted">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </>
  );
}
