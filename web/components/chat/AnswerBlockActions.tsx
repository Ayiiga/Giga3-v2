"use client";

import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import { COPY_SUCCESS, SHARE_SUCCESS } from "@/lib/chat/chatContentFormat";
import {
  getActiveSpeechBlockId,
  isGigaVoiceSpeaking,
  isGigaVoiceSupported,
  toggleGigaVoiceBlock,
} from "@/lib/chat/gigaVoice";
import { readVoiceLanguageId, subscribeVoiceLanguageId } from "@/lib/chat/voiceLanguagePreference";
import { copyMarkdownToClipboard, shareText } from "@/lib/share/clientShare";
import { useShareAction } from "@/hooks/useShareAction";
import { cn } from "@/lib/utils";
import { Check, Copy, Share2, Volume2, VolumeX } from "lucide-react";
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
  const { feedback, runAction, busy } = useShareAction();
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voiceId, setVoiceId] = useState(() => readVoiceLanguageId());
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => subscribeVoiceLanguageId(setVoiceId), []);
  useEffect(() => {
    setVoiceSupported(isGigaVoiceSupported());
  }, []);

  useEffect(() => {
    if (!speaking) return;
    const id = window.setInterval(() => {
      const active = isGigaVoiceSpeaking() && getActiveSpeechBlockId() === blockId;
      if (!active) setSpeaking(false);
    }, 300);
    return () => window.clearInterval(id);
  }, [speaking, blockId]);

  const flashCopied = useCallback(() => {
    setCopied(true);
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  const runCopy = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const result = await runAction(() => copyMarkdownToClipboard(trimmed), COPY_SUCCESS);
    if (result?.ok) flashCopied();
  }, [text, runAction, flashCopied]);

  const runShare = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await runAction(
      () =>
        shareText({
          title: `Giga3 AI — ${label}`,
          text: trimmed,
        }),
      SHARE_SUCCESS
    );
  }, [text, label, runAction]);

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

  if (!text.trim()) return null;

  return (
    <div className={cn("answer-block-actions", className)}>
      <ShareActionFeedback feedback={feedback} align="end" className="answer-block-actions__feedback" />
      <div className="answer-block-actions__row" role="group" aria-label={`${label} actions`}>
        <button
          type="button"
          onClick={() => void runCopy()}
          disabled={busy}
          aria-label={copied ? COPY_SUCCESS : `Copy ${label}`}
          title={copied ? COPY_SUCCESS : "Copy"}
          className="answer-block-actions__btn"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="sr-only sm:not-sr-only">{copied ? "Copied" : "Copy"}</span>
        </button>
        <button
          type="button"
          onClick={() => void runShare()}
          disabled={busy}
          aria-label={`Share ${label}`}
          title="Share"
          className="answer-block-actions__btn"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">Share</span>
        </button>
        {voiceSupported ? (
          <button
            type="button"
            onClick={() => void runReadAloud()}
            aria-label={speaking ? `Stop reading ${label}` : `Read aloud ${label}`}
            aria-pressed={speaking}
            title={speaking ? "Stop" : "Read aloud"}
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
            <span className="sr-only sm:not-sr-only">{speaking ? "Stop" : "Read aloud"}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
});
