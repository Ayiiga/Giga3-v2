"use client";

import {
  getActiveSpeechBlockId,
  isGigaVoiceSpeaking,
  isGigaVoiceSupported,
  toggleGigaVoiceBlock,
} from "@/lib/chat/gigaVoice";
import { readVoiceLanguageId, subscribeVoiceLanguageId } from "@/lib/chat/voiceLanguagePreference";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

type AnswerBlockActionsProps = {
  blockId: string;
  text: string;
  label: string;
  className?: string;
};

export const AnswerBlockActions = memo(function AnswerBlockActions({
  blockId,
  text,
  label,
  className,
}: AnswerBlockActionsProps) {
  const [speaking, setSpeaking] = useState(false);
  const [voiceId, setVoiceId] = useState(() => readVoiceLanguageId());

  useEffect(() => subscribeVoiceLanguageId(setVoiceId), []);

  useEffect(() => {
    if (!speaking) return;
    const id = window.setInterval(() => {
      const active = isGigaVoiceSpeaking() && getActiveSpeechBlockId() === blockId;
      if (!active) setSpeaking(false);
    }, 300);
    return () => window.clearInterval(id);
  }, [speaking, blockId]);

  const runReadAloud = useCallback(async () => {
    if (!isGigaVoiceSupported() || !text.trim()) return;
    const started = await toggleGigaVoiceBlock({
      blockId,
      text,
      voiceId,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
    if (!started && !isGigaVoiceSpeaking()) setSpeaking(false);
  }, [blockId, text, voiceId]);

  if (!isGigaVoiceSupported() || !text.trim()) return null;

  return (
    <div className={cn("answer-block-actions", className)}>
      <button
        type="button"
        onClick={() => void runReadAloud()}
        aria-label={speaking ? `Stop reading ${label}` : `Read aloud ${label}`}
        aria-pressed={speaking}
        className={cn(
          "answer-block-actions__btn",
          speaking && "answer-block-actions__btn--active"
        )}
      >
        {speaking ? (
          <VolumeX className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Volume2 className="h-3.5 w-3.5" aria-hidden />
        )}
        <span>{speaking ? "Stop" : "Read aloud"}</span>
      </button>
    </div>
  );
});
