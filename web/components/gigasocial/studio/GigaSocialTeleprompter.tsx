"use client";

import {
  advanceTeleprompterOffset,
  clampTeleprompterFontSize,
  clampTeleprompterSpeed,
  DEFAULT_TELEPROMPTER_SCRIPT,
} from "@/lib/gigasocial/teleprompter";
import { cn } from "@/lib/utils";
import { Pause, Play, Settings2 } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

type GigaSocialTeleprompterProps = {
  active: boolean;
  recording: boolean;
  className?: string;
};

export const GigaSocialTeleprompter = memo(function GigaSocialTeleprompter({
  active,
  recording,
  className,
}: GigaSocialTeleprompterProps) {
  const [script, setScript] = useState(DEFAULT_TELEPROMPTER_SCRIPT);
  const [speed, setSpeed] = useState(48);
  const [fontSize, setFontSize] = useState(18);
  const [mirror, setMirror] = useState(false);
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [offsetPx, setOffsetPx] = useState(0);
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !recording || paused) {
      lastTickRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (lastTickRef.current != null) {
        const delta = now - lastTickRef.current;
        setOffsetPx((current) =>
          advanceTeleprompterOffset(current, clampTeleprompterSpeed(speed), delta, paused)
        );
      }
      lastTickRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, paused, recording, speed]);

  useEffect(() => {
    if (!recording) {
      setOffsetPx(0);
      setPaused(false);
      lastTickRef.current = null;
    }
  }, [recording]);

  if (!active) return null;

  return (
    <div
      className={cn(
        "gigasocial-teleprompter pointer-events-none absolute inset-x-3 top-14 z-20 flex max-h-[38%] flex-col",
        className
      )}
    >
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-white/20 bg-black/55 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
            Teleprompter
          </span>
          <div className="flex items-center gap-1">
            {recording ? (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                className="rounded-lg p-1.5 text-white/90 hover:bg-white/10"
                aria-label={paused ? "Resume teleprompter" : "Pause teleprompter"}
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setSettingsOpen((value) => !value)}
              className="rounded-lg p-1.5 text-white/90 hover:bg-white/10"
              aria-label="Teleprompter settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {settingsOpen && !recording ? (
          <div className="space-y-2 border-b border-white/10 px-3 py-2 text-white">
            <label className="block text-[10px] text-white/70">
              Script
              <textarea
                value={script}
                onChange={(event) => setScript(event.target.value)}
                rows={4}
                className="mt-1 w-full resize-none rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
              />
            </label>
            <label className="flex items-center justify-between text-[10px] text-white/70">
              Speed
              <input
                type="range"
                min={20}
                max={120}
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                className="w-28 accent-violet-400"
              />
            </label>
            <label className="flex items-center justify-between text-[10px] text-white/70">
              Text size
              <input
                type="range"
                min={14}
                max={28}
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
                className="w-28 accent-violet-400"
              />
            </label>
            <label className="flex items-center gap-2 text-[10px] text-white/80">
              <input
                type="checkbox"
                checked={mirror}
                onChange={(event) => setMirror(event.target.checked)}
              />
              Mirror mode
            </label>
          </div>
        ) : null}

        <div className="relative max-h-32 overflow-hidden px-3 py-2">
          <p
            className="whitespace-pre-wrap leading-relaxed text-white/95"
            style={{
              fontSize: `${clampTeleprompterFontSize(fontSize)}px`,
              transform: mirror ? "scaleX(-1)" : undefined,
              marginTop: `-${offsetPx}px`,
            }}
          >
            {script.trim() || DEFAULT_TELEPROMPTER_SCRIPT}
          </p>
        </div>
      </div>
    </div>
  );
});
