"use client";

import { useVoiceDictation } from "@/hooks/useVoiceDictation";
import { cn } from "@/lib/utils";
import { Mic } from "lucide-react";

type VoiceInputButtonProps = {
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  className?: string;
};

/** Mic control for chat composer — always visible, including mobile typing mode. */
export function VoiceInputButton({
  disabled,
  onTranscript,
  onError,
  className,
}: VoiceInputButtonProps) {
  const { supported, listening, toggle } = useVoiceDictation({
    onTranscript,
    onError,
  });

  if (!supported) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={listening ? "Stop voice input" : "Voice input"}
      aria-pressed={listening}
      title={listening ? "Listening… tap to stop" : "Voice input"}
      onClick={toggle}
      className={cn(
        "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm",
        "hover:border-accent/30 hover:bg-accent/5",
        listening && "border-accent/40 bg-accent/10 text-accent",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <Mic className="h-5 w-5" aria-hidden />
    </button>
  );
}
