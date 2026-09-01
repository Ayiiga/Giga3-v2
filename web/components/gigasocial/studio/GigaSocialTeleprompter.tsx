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
import { Pause, Play, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

type GigaSocialTeleprompterProps = {
  active: boolean;
  recording: boolean;
  className?: string;
  /** GigaEdit studio: clean script overlay over fullscreen camera. */
  presentation?: "default" | "studio";
  /** Open script editor on first mount (studio). */
  defaultSettingsOpen?: boolean;
};

export const GigaSocialTeleprompter = memo(function GigaSocialTeleprompter({
  active,
  recording,
  className,
  presentation = "default",
  defaultSettingsOpen = false,
}: GigaSocialTeleprompterProps) {
  const isStudio = presentation === "studio";
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
  const [settingsOpen, setSettingsOpen] = useState(defaultSettingsOpen);
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
    setSpeed(isStudio ? Math.max(saved.speed, 52) : saved.speed);
    setFontSize(isStudio ? Math.max(saved.fontSize, 26) : saved.fontSize);
    setMarginPx(isStudio ? Math.max(saved.marginPx, 16) : saved.marginPx);
    setMirror(saved.mirror);
    setDarkMode(isStudio ? false : saved.darkMode);
    setTransparentMode(isStudio ? true : saved.transparentMode);
    setFloating(saved.floating);
    setCountdownSec(saved.countdownSec);
  }, [isStudio]);

  useEffect(() => {
    if (!active || !isStudio) return;
    function onOpenSettings() {
      setSettingsOpen(true);
    }
    window.addEventListener("giga3:teleprompter-open-settings", onOpenSettings);
    return () => window.removeEventListener("giga3:teleprompter-open-settings", onOpenSettings);
  }, [active, isStudio]);

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
    function onVoiceTick() {
      setOffsetPx((current) =>
        advanceTeleprompterOffset(current, clampTeleprompterSpeed(speed), 280, false)
      );
    }
    window.addEventListener("giga3:teleprompter-voice-tick", onVoiceTick);
    return () => window.removeEventListener("giga3:teleprompter-voice-tick", onVoiceTick);
  }, [active, speed]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
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
    ? "bg-transparent"
    : darkMode
      ? "bg-black/70"
      : isStudio
        ? "bg-white/94 text-slate-900 shadow-xl"
        : "bg-white/90 text-zinc-900";

  const scrollMaxClass = isStudio
    ? settingsOpen
      ? "max-h-[min(38vh,20rem)]"
      : "max-h-none flex-1"
    : "max-h-32";

  const scriptTextClass = isStudio && !settingsOpen
    ? "text-white font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_0_16px_rgba(0,0,0,0.65)]"
    : cn(
        darkMode || transparentMode ? "text-white/95" : "text-slate-900",
        isStudio && !darkMode && !transparentMode && "text-slate-950 drop-shadow-sm"
      );

  if (isStudio && !settingsOpen) {
    return (
      <div
        className={cn(
          "gigasocial-teleprompter pointer-events-none absolute z-20 flex flex-col",
          "inset-x-4 top-[max(4.5rem,env(safe-area-inset-top))] bottom-[max(9rem,env(safe-area-inset-bottom))]",
          className
        )}
        style={{ marginLeft: marginPx, marginRight: marginPx }}
      >
        {recording ? (
          <div className="pointer-events-auto mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              className="rounded-full bg-black/45 p-2 text-white backdrop-blur-sm"
              aria-label={paused ? "Resume teleprompter" : "Pause teleprompter"}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          </div>
        ) : null}

        <div className={cn("relative min-h-0 flex-1 overflow-hidden", scrollMaxClass)}>
          {countdownLeft > 0 ? (
            <p className="absolute inset-0 z-10 flex items-center justify-center text-5xl font-bold text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">
              {countdownLeft}
            </p>
          ) : null}
          <p
            className={cn("whitespace-pre-wrap leading-relaxed", scriptTextClass)}
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
    );
  }

  if (isStudio && settingsOpen) {
    return (
      <div
        className={cn(
          "gigasocial-teleprompter pointer-events-none absolute z-30 inset-x-0 bottom-0",
          className
        )}
      >
        <div className="pointer-events-auto mx-3 mb-[max(7.5rem,env(safe-area-inset-bottom))] max-h-[min(62vh,28rem)] overflow-y-auto rounded-2xl border border-white/15 bg-[#0b1220]/92 p-4 text-white shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Script & settings</p>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="rounded-full p-1.5 hover:bg-white/10"
              aria-label="Close script editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="block text-[11px] text-white/70">
            Script
            <textarea
              value={script}
              onChange={(event) => setScript(event.target.value)}
              rows={5}
              className="mt-1 w-full resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </label>

          <div className="mt-2 flex gap-2">
            <input
              value={topicDraft}
              onChange={(event) => setTopicDraft(event.target.value)}
              placeholder="Topic for AI script"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => setScript(generateTeleprompterScript(topicDraft))}
              className="shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold"
            >
              AI script
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-white/80">
            <label className="space-y-1">
              Speed
              <input
                type="range"
                min={20}
                max={120}
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                className="w-full accent-violet-400"
              />
            </label>
            <label className="space-y-1">
              Font size
              <input
                type="range"
                min={18}
                max={40}
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
                className="w-full accent-violet-400"
              />
            </label>
            <label className="space-y-1">
              Margins
              <input
                type="range"
                min={0}
                max={48}
                value={marginPx}
                onChange={(event) => setMarginPx(clampTeleprompterMargin(Number(event.target.value)))}
                className="w-full accent-violet-400"
              />
            </label>
            <label className="space-y-1">
              Countdown
              <input
                type="range"
                min={0}
                max={10}
                value={countdownSec}
                onChange={(event) =>
                  setCountdownSec(clampTeleprompterCountdown(Number(event.target.value)))
                }
                className="w-full accent-violet-400"
              />
            </label>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={mirror}
              onChange={(event) => setMirror(event.target.checked)}
            />
            Mirror text
          </label>

          <p className="mt-2 text-[10px] text-white/50">
            Auto-saves. Space pauses scroll while recording.
          </p>
        </div>

        <div
          className={cn(
            "pointer-events-none absolute inset-x-4 top-auto bottom-[max(9rem,env(safe-area-inset-bottom))] max-h-[28vh] overflow-hidden opacity-40",
            scrollMaxClass
          )}
          style={{ marginLeft: marginPx, marginRight: marginPx }}
          aria-hidden
        >
          <p
            className={cn("whitespace-pre-wrap leading-relaxed", scriptTextClass)}
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
    );
  }

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
          "pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border backdrop-blur-md",
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
            <button
              type="button"
              onClick={() => setSettingsOpen((value) => !value)}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold hover:bg-white/10"
              aria-label="Edit teleprompter script"
            >
              Edit
            </button>
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
          </div>
        </div>

        {settingsOpen ? (
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

        <div className={cn("relative min-h-0 flex-1 overflow-hidden px-3 py-2", scrollMaxClass)}>
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
            className={cn("whitespace-pre-wrap font-medium leading-relaxed", scriptTextClass)}
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
