"use client";

import {
  advanceTeleprompterOffset,
  clampTeleprompterCountdown,
  clampTeleprompterFontSize,
  clampTeleprompterMargin,
  clampTeleprompterSpeed,
  DEFAULT_TELEPROMPTER_SCRIPT,
} from "@/lib/gigasocial/teleprompter";
import {
  generateTeleprompterScript,
  loadTeleprompterScript,
  loadTeleprompterSettings,
  saveTeleprompterScript,
  saveTeleprompterSettings,
} from "@/lib/gigasocial/teleprompterScripts";
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
  const [marginPx, setMarginPx] = useState(12);
  const [mirror, setMirror] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [transparentMode, setTransparentMode] = useState(false);
  const [floating, setFloating] = useState(false);
  const [countdownSec, setCountdownSec] = useState(3);
  const [countdownLeft, setCountdownLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [offsetPx, setOffsetPx] = useState(0);
  const [topicDraft, setTopicDraft] = useState("");
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const saved = loadTeleprompterSettings();
    setScript(loadTeleprompterScript());
    setSpeed(saved.speed);
    setFontSize(saved.fontSize);
    setMarginPx(saved.marginPx);
    setMirror(saved.mirror);
    setDarkMode(saved.darkMode);
    setTransparentMode(saved.transparentMode);
    setFloating(saved.floating);
    setCountdownSec(saved.countdownSec);
  }, []);

  useEffect(() => {
    if (!active) return;
    saveTeleprompterScript(script);
  }, [active, script]);

  useEffect(() => {
    if (!active) return;
    saveTeleprompterSettings({
      speed,
      fontSize,
      marginPx,
      mirror,
      darkMode,
      transparentMode,
      floating,
      countdownSec,
    });
  }, [
    active,
    countdownSec,
    darkMode,
    floating,
    fontSize,
    marginPx,
    mirror,
    speed,
    transparentMode,
  ]);

  useEffect(() => {
    if (!active || !recording) {
      setCountdownLeft(0);
      return;
    }
    const start = clampTeleprompterCountdown(countdownSec);
    if (start <= 0) return;
    setCountdownLeft(start);
    setPaused(true);
    const timer = window.setInterval(() => {
      setCountdownLeft((left) => {
        if (left <= 1) {
          window.clearInterval(timer);
          setPaused(false);
          return 0;
        }
        return left - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, countdownSec, recording]);

  useEffect(() => {
    if (!active || !recording || paused || countdownLeft > 0) {
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
  }, [active, countdownLeft, paused, recording, speed]);

  useEffect(() => {
    if (!recording) {
      setOffsetPx(0);
      setPaused(false);
      lastTickRef.current = null;
    }
  }, [recording]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      // Bluetooth / media remote friendly: Space toggles pause while recording.
      if (event.code === "Space" && recording) {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, recording]);

  if (!active) return null;

  const panelBg = transparentMode
    ? "bg-black/25"
    : darkMode
      ? "bg-black/70"
      : "bg-white/90 text-zinc-900";

  return (
    <div
      className={cn(
        "gigasocial-teleprompter pointer-events-none absolute z-20 flex flex-col",
        floating
          ? "inset-x-6 bottom-24 top-auto max-h-[30%]"
          : "inset-x-3 top-14 max-h-[38%]",
        className
      )}
      style={{ marginLeft: marginPx, marginRight: marginPx }}
    >
      <div
        className={cn(
          "pointer-events-auto overflow-hidden rounded-xl border backdrop-blur-sm",
          transparentMode ? "border-white/10" : "border-white/20",
          panelBg
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b px-2 py-1.5",
            darkMode || transparentMode ? "border-white/10 text-white/80" : "border-zinc-200"
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide">Teleprompter</span>
          <div className="flex items-center gap-1">
            {recording ? (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                className="rounded-lg p-1.5 hover:bg-white/10"
                aria-label={paused ? "Resume teleprompter" : "Pause teleprompter"}
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setSettingsOpen((value) => !value)}
              className="rounded-lg p-1.5 hover:bg-white/10"
              aria-label="Teleprompter settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {settingsOpen && !recording ? (
          <div
            className={cn(
              "space-y-2 border-b px-3 py-2 text-[10px]",
              darkMode || transparentMode
                ? "border-white/10 text-white/80"
                : "border-zinc-200 text-zinc-700"
            )}
          >
            <label className="block">
              Script
              <textarea
                value={script}
                onChange={(event) => setScript(event.target.value)}
                rows={4}
                className={cn(
                  "mt-1 w-full resize-none rounded-lg border px-2 py-1.5 text-xs",
                  darkMode || transparentMode
                    ? "border-white/15 bg-black/40 text-white"
                    : "border-zinc-200 bg-white text-zinc-900"
                )}
              />
            </label>
            <div className="flex gap-1">
              <input
                value={topicDraft}
                onChange={(event) => setTopicDraft(event.target.value)}
                placeholder="Topic for AI script"
                className={cn(
                  "min-w-0 flex-1 rounded-lg border px-2 py-1 text-xs",
                  darkMode || transparentMode
                    ? "border-white/15 bg-black/40 text-white"
                    : "border-zinc-200 bg-white"
                )}
              />
              <button
                type="button"
                onClick={() => setScript(generateTeleprompterScript(topicDraft))}
                className="rounded-lg border border-violet-300/50 bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white"
              >
                AI script
              </button>
            </div>
            <label className="flex items-center justify-between">
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
            <label className="flex items-center justify-between">
              Font size
              <input
                type="range"
                min={14}
                max={36}
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
                className="w-28 accent-violet-400"
              />
            </label>
            <label className="flex items-center justify-between">
              Margins
              <input
                type="range"
                min={0}
                max={48}
                value={marginPx}
                onChange={(event) => setMarginPx(clampTeleprompterMargin(Number(event.target.value)))}
                className="w-28 accent-violet-400"
              />
            </label>
            <label className="flex items-center justify-between">
              Countdown
              <input
                type="range"
                min={0}
                max={10}
                value={countdownSec}
                onChange={(event) =>
                  setCountdownSec(clampTeleprompterCountdown(Number(event.target.value)))
                }
                className="w-28 accent-violet-400"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={mirror}
                  onChange={(event) => setMirror(event.target.checked)}
                />
                Mirror
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(event) => setDarkMode(event.target.checked)}
                />
                Dark
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={transparentMode}
                  onChange={(event) => setTransparentMode(event.target.checked)}
                />
                Transparent
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={floating}
                  onChange={(event) => setFloating(event.target.checked)}
                />
                Floating
              </label>
            </div>
            <p className="text-[10px] opacity-80">
              Auto-saves script & settings. Space / Bluetooth media key pauses while recording.
            </p>
          </div>
        ) : null}

        <div className="relative max-h-32 overflow-hidden px-3 py-2">
          {countdownLeft > 0 ? (
            <p
              className={cn(
                "absolute inset-0 z-10 flex items-center justify-center text-4xl font-bold",
                darkMode || transparentMode ? "text-white" : "text-zinc-900"
              )}
            >
              {countdownLeft}
            </p>
          ) : null}
          <p
            className={cn(
              "whitespace-pre-wrap leading-relaxed",
              darkMode || transparentMode ? "text-white/95" : "text-zinc-900"
            )}
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
