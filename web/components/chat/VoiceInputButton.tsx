"use client";

import { useVoiceDictation } from "@/hooks/useVoiceDictation";
import { cn } from "@/lib/utils";
import { Mic } from "lucide-react";

type VoiceInputButtonProps = {
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  onListeningChange?: (listening: boolean) => void;
  className?: string;
};

/** Mic control for chat composer — always visible, including mobile typing mode. */
export function VoiceInputButton({
  disabled,
  onTranscript,
  onError,
  onListeningChange,
  className,
}: VoiceInputButtonProps) {
  const { supported, listening, toggle } = useVoiceDictation({
    onTranscript,
    onError,
    onListeningChange,
  });

  if (!supported) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={listening ? "Stop voice input" : "Voice input"}
      aria-pressed={listening}
      title={listening ? "Listening… tap to stop" : "Voice input (Twi/Hausa available)"}
      onClick={toggle}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#374151] shadow-sm",
        "hover:bg-[#EAB308]/20",
        listening && "bg-[#EAB308] text-black",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <Mic className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
