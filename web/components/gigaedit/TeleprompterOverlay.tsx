"use client";

import { loadTeleprompterScript } from "@/lib/gigasocial/teleprompterScripts";
import { shouldUseSolidPanels } from "@/lib/gigaedit/lowEndUi";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type TeleprompterOverlayProps = {
  script?: string;
  isVisible?: boolean;
  /** 0–1 overlay opacity (default 0.7). */
  opacity?: number;
  /** Base scroll speed in words per minute. */
  speedWpm?: number;
  recording?: boolean;
  onClose?: () => void;
  className?: string;
};

const MIN_OPACITY = 0.5;
const MAX_OPACITY = 1;
const MIN_SPEED = 0.5;
const MAX_SPEED = 2;

export function TeleprompterOverlay({
  script,
  isVisible = true,
  opacity: opacityProp = 0.7,
  speedWpm = 120,
  recording = false,
  onClose,
  className,
}: TeleprompterOverlayProps) {
  const [visible, setVisible] = useState(isVisible);
  const [opacityPct, setOpacityPct] = useState(Math.round(opacityProp * 100));
  const [speedMult, setSpeedMult] = useState(1);
  const [fontSize, setFontSize] = useState(15);
  const solidPanels = useMemo(() => shouldUseSolidPanels(), []);

  const text = script ?? loadTeleprompterScript();
  const scrollDurationSec = Math.max(
    12,
    Math.min(48, (text.split(/\s+/).filter(Boolean).length / speedWpm) * 60 / speedMult)
  );

  useEffect(() => {
    setVisible(isVisible);
  }, [isVisible]);

  if (!visible) {
    return (
      <button
        type="button"
        className="teleprompter-overlay__eye-toggle pointer-events-auto absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
        aria-label="Show teleprompter"
        onClick={() => setVisible(true)}
      >
        <Eye className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  const opacity = opacityPct / 100;

  return (
    <div
      className={cn("teleprompter-overlay pointer-events-none absolute inset-0 z-30", className)}
      aria-live="polite"
      data-recording={recording ? "true" : "false"}
    >
      <div
        className={cn(
          "teleprompter-overlay__band pointer-events-auto absolute left-2 right-2 top-2 flex flex-col overflow-hidden rounded-xl p-3",
          solidPanels ? "teleprompter-overlay__band--solid" : "backdrop-blur-[8px]"
        )}
        style={{
          height: "25%",
          backgroundColor: `rgba(0, 0, 0, ${opacity})`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-[#0b1220]"
            style={{ backgroundColor: "#eab308" }}
          >
            TOP · {opacityPct}% · Subject visible below
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
              aria-label="Hide teleprompter"
              onClick={() => {
                setVisible(false);
                onClose?.();
              }}
            >
              <EyeOff className="h-4 w-4" aria-hidden />
            </button>
            {onClose ? (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="Close teleprompter"
                onClick={onClose}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <div
          className="teleprompter-overlay__scroll relative mt-2 min-h-0 flex-1 overflow-hidden text-sm font-semibold leading-snug text-white"
          style={{
            fontSize: `${fontSize}px`,
            animationDuration: `${scrollDurationSec}s`,
            animationPlayState: recording ? "running" : "paused",
          }}
        >
          <p className="teleprompter-overlay__script whitespace-pre-wrap">{text}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-white/85">
          <label className="flex min-w-[5.5rem] flex-1 items-center gap-1">
            <span className="shrink-0">Opacity</span>
            <input
              type="range"
              min={50}
              max={100}
              value={opacityPct}
              onChange={(e) => setOpacityPct(Number(e.target.value))}
              className="gigasocial-teleprompter-mini-slider w-full"
            />
          </label>
          <label className="flex min-w-[5.5rem] flex-1 items-center gap-1">
            <span className="shrink-0">Speed</span>
            <input
              type="range"
              min={MIN_SPEED * 10}
              max={MAX_SPEED * 10}
              step={5}
              value={speedMult * 10}
              onChange={(e) => setSpeedMult(Number(e.target.value) / 10)}
              className="gigasocial-teleprompter-mini-slider w-full"
            />
            <span>{speedMult.toFixed(1)}x</span>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40"
              aria-label="Smaller text"
              onClick={() => setFontSize((s) => Math.max(11, s - 1))}
            >
              <Minus className="h-3 w-3" aria-hidden />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40"
              aria-label="Larger text"
              onClick={() => setFontSize((s) => Math.min(22, s + 1))}
            >
              <Plus className="h-3 w-3" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div
        className="teleprompter-overlay__safe-line pointer-events-none absolute inset-x-2 border-b-2 border-[#22c55e]/50"
        style={{ top: "calc(25% + 0.5rem)" }}
        aria-hidden
      />
    </div>
  );
}
