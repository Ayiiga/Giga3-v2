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
  getActiveTeleprompterLineIndex,
  getTeleprompterLineAppearance,
  mapFontSizeToLabel,
  mapSpeedToLabel,
  resolveTeleprompterColor,
  splitTeleprompterLines,
  TELEPROMPTER_COLOR_OPTIONS,
  type TeleprompterColorId,
} from "@/lib/gigasocial/teleprompterDisplay";
import {
  generateTeleprompterScript,
  loadTeleprompterScript,
  loadTeleprompterSettings,
  saveTeleprompterScript,
  saveTeleprompterSettings,
} from "@/lib/gigasocial/teleprompterScripts";
import { cn } from "@/lib/utils";
import {
  Move,
  Pause,
  Pencil,
  Play,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

type GigaSocialTeleprompterProps = {
  active: boolean;
  recording: boolean;
  className?: string;
  /** GigaEdit studio: CapCut-style glass overlay over fullscreen camera. */
  presentation?: "default" | "studio";
  /** Open script editor on first mount (studio). */
  defaultSettingsOpen?: boolean;
};

type StudioPanelMode = "none" | "settings" | "edit";

function sliderPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.round(((value - min) / (max - min)) * 100);
}

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
  const [panelMode, setPanelMode] = useState<StudioPanelMode>(
    defaultSettingsOpen ? "edit" : "none"
  );
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [textColorId, setTextColorId] = useState<TeleprompterColorId>("mint");
  const [offsetPx, setOffsetPx] = useState(0);
  const [topicDraft, setTopicDraft] = useState("");
  const [cardOffset, setCardOffset] = useState({ x: 0, y: 0 });
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const hydratedRef = useRef(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const saved = loadTeleprompterSettings();
    setScript(loadTeleprompterScript());
    setSpeed(isStudio ? Math.max(saved.speed, 56) : saved.speed);
    setFontSize(isStudio ? Math.max(saved.fontSize, 28) : saved.fontSize);
    setMarginPx(isStudio ? Math.max(saved.marginPx, 16) : saved.marginPx);
    setMirror(saved.mirror);
    setDarkMode(isStudio ? false : saved.darkMode);
    setTransparentMode(isStudio ? true : saved.transparentMode);
    setFloating(saved.floating);
    setCountdownSec(saved.countdownSec);
    setTextColorId(saved.textColorId ?? "mint");
  }, [isStudio]);

  useEffect(() => {
    if (!active || !isStudio) return;
    function onOpenSettings() {
      setOverlayVisible(true);
      setPanelMode("edit");
    }
    function onShowOverlay() {
      setOverlayVisible(true);
      setPanelMode("none");
    }
    window.addEventListener("giga3:teleprompter-open-settings", onOpenSettings);
    window.addEventListener("giga3:teleprompter-show-overlay", onShowOverlay);
    return () => {
      window.removeEventListener("giga3:teleprompter-open-settings", onOpenSettings);
      window.removeEventListener("giga3:teleprompter-show-overlay", onShowOverlay);
    };
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
      textColorId,
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
    textColorId,
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

  useEffect(() => {
    if (!isStudio) return;
    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      setCardOffset({
        x: dragRef.current.originX + (event.clientX - dragRef.current.startX),
        y: dragRef.current.originY + (event.clientY - dragRef.current.startY),
      });
    };
    const onPointerUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isStudio]);

  if (!active) return null;

  const accentColor = resolveTeleprompterColor(textColorId);
  const lines = splitTeleprompterLines(script.trim() || DEFAULT_TELEPROMPTER_SCRIPT);
  const activeLineIndex = getActiveTeleprompterLineIndex(
    offsetPx,
    clampTeleprompterFontSize(fontSize)
  );
  const resolvedFontSize = clampTeleprompterFontSize(fontSize);

  const panelBg = transparentMode
    ? "bg-transparent"
    : darkMode
      ? "bg-black/70"
      : isStudio
        ? "bg-white/94 text-slate-900 shadow-xl"
        : "bg-white/90 text-zinc-900";

  const scrollMaxClass = isStudio
    ? panelMode !== "none"
      ? "max-h-[min(30vh,14rem)]"
      : "max-h-none flex-1"
    : "max-h-32";

  const scriptTextClass = isStudio && panelMode === "none"
    ? "gigasocial-teleprompter-script"
    : cn(
        darkMode || transparentMode ? "text-white/95" : "text-slate-900",
        isStudio && !darkMode && !transparentMode && "text-slate-950 drop-shadow-sm"
      );

  function beginCardDrag(event: React.PointerEvent<HTMLButtonElement>) {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: cardOffset.x,
      originY: cardOffset.y,
    };
  }

  function renderStudioScript() {
    return (
      <div
        className={cn("relative min-h-0 flex-1 overflow-hidden", scrollMaxClass)}
        style={{ marginLeft: marginPx, marginRight: marginPx }}
      >
        {countdownLeft > 0 ? (
          <p className="absolute inset-0 z-10 flex items-center justify-center text-6xl font-bold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.95)]">
            {countdownLeft}
          </p>
        ) : null}
        <div
          className={cn(scriptTextClass)}
          style={{
            transform: mirror ? "scaleX(-1)" : undefined,
            marginTop: `-${offsetPx}px`,
          }}
        >
          {lines.map((line, index) => {
            const appearance = getTeleprompterLineAppearance(index, activeLineIndex, accentColor);
            return (
              <p
                key={`${index}-${line.slice(0, 12)}`}
                className="whitespace-pre-wrap leading-[1.38]"
                style={{
                  fontSize: `${resolvedFontSize}px`,
                  color: appearance.color,
                  opacity: appearance.opacity,
                  fontWeight: appearance.fontWeight,
                }}
              >
                {line || "\u00a0"}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStudioSettingsSheet() {
    const speedPct = sliderPercent(speed, 20, 120);
    const fontPct = sliderPercent(fontSize, 18, 40);

    return (
      <div
        className={cn(
          "gigasocial-teleprompter pointer-events-none absolute inset-x-0 bottom-0 z-40",
          className
        )}
      >
        <div
          className="gigasocial-teleprompter-settings-sheet pointer-events-auto mx-0 rounded-t-[1.75rem] px-5 pb-[max(7.5rem,env(safe-area-inset-bottom))] pt-4 text-white"
          role="dialog"
          aria-label="Teleprompter settings"
        >
          <div className="space-y-5">
            <label className="block">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>Speed</span>
                <span className="text-xs font-medium text-white/55">{mapSpeedToLabel(speed)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-10 text-xs text-white/45">Slow</span>
                <input
                  type="range"
                  min={20}
                  max={120}
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                  className="gigasocial-teleprompter-slider min-w-0 flex-1"
                  style={{ "--tp-slider-pct": `${speedPct}%` } as React.CSSProperties}
                />
                <span className="w-10 text-right text-xs text-white/45">Fast</span>
              </div>
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>Font size</span>
                <span className="text-xs font-medium text-white/55">
                  {mapFontSizeToLabel(fontSize)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-10 text-xs text-white/45">Small</span>
                <input
                  type="range"
                  min={18}
                  max={40}
                  value={fontSize}
                  onChange={(event) => setFontSize(Number(event.target.value))}
                  className="gigasocial-teleprompter-slider min-w-0 flex-1"
                  style={{ "--tp-slider-pct": `${fontPct}%` } as React.CSSProperties}
                />
                <span className="w-10 text-right text-xs text-white/45">Big</span>
              </div>
            </label>

            <div>
              <p className="mb-3 text-sm font-semibold">Color</p>
              <div className="flex flex-wrap items-center gap-3">
                {TELEPROMPTER_COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={`Text color ${option.label}`}
                    data-selected={textColorId === option.id}
                    className="gigasocial-teleprompter-color-swatch"
                    style={{ backgroundColor: option.value }}
                    onClick={() => setTextColorId(option.id)}
                  />
                ))}
              </div>
            </div>

            <label className="block text-sm">
              <span className="font-semibold">Countdown</span>
              <input
                type="range"
                min={0}
                max={10}
                value={countdownSec}
                onChange={(event) =>
                  setCountdownSec(clampTeleprompterCountdown(Number(event.target.value)))
                }
                className="gigasocial-teleprompter-slider mt-3 w-full"
                style={
                  {
                    "--tp-slider-pct": `${sliderPercent(countdownSec, 0, 10)}%`,
                  } as React.CSSProperties
                }
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={mirror}
                onChange={(event) => setMirror(event.target.checked)}
              />
              Mirror text
            </label>
          </div>
        </div>
      </div>
    );
  }

  function renderStudioEditSheet() {
    return (
      <div
        className={cn(
          "gigasocial-teleprompter pointer-events-none absolute inset-x-0 bottom-0 z-40",
          className
        )}
      >
        <div
          className="gigasocial-teleprompter-settings-sheet pointer-events-auto mx-0 max-h-[min(70vh,32rem)] overflow-y-auto rounded-t-[1.75rem] px-5 pb-[max(7.5rem,env(safe-area-inset-bottom))] pt-4 text-white"
          role="dialog"
          aria-label="Edit teleprompter script"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Edit script</p>
            <button
              type="button"
              onClick={() => setPanelMode("none")}
              className="rounded-full p-1.5 hover:bg-white/10"
              aria-label="Close script editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="block text-sm">
            <span className="mb-2 block font-medium text-white/75">Your script</span>
            <textarea
              value={script}
              onChange={(event) => setScript(event.target.value)}
              rows={7}
              className="w-full resize-none rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-base leading-relaxed text-white"
            />
          </label>

          <div className="mt-3 flex gap-2">
            <input
              value={topicDraft}
              onChange={(event) => setTopicDraft(event.target.value)}
              placeholder="Topic for AI script"
              className="min-w-0 flex-1 rounded-2xl border border-white/12 bg-black/35 px-4 py-2.5 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => setScript(generateTeleprompterScript(topicDraft))}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              AI script
            </button>
          </div>

          <p className="mt-3 text-xs text-white/45">
            Auto-saves. Press space to pause scroll while recording.
          </p>
        </div>
      </div>
    );
  }

  if (isStudio) {
    return (
      <div
        className={cn(
          "gigasocial-teleprompter gigasocial-teleprompter--studio pointer-events-none absolute inset-0 z-20",
          className
        )}
        style={{ "--tp-accent": accentColor } as React.CSSProperties}
      >
        {overlayVisible && panelMode === "none" ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-[max(4.75rem,env(safe-area-inset-top))] flex justify-center px-4"
            style={{ transform: `translate(${cardOffset.x}px, ${cardOffset.y}px)` }}
          >
            <div
              className="gigasocial-teleprompter-card pointer-events-auto flex w-[min(92vw,24rem)] max-h-[min(44vh,21rem)] flex-col rounded-[1.35rem] px-4 pb-2 pt-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                {recording ? (
                  <button
                    type="button"
                    onClick={() => setPaused((value) => !value)}
                    className="gigasocial-teleprompter-toolbar-btn rounded-full p-2"
                    aria-label={paused ? "Resume teleprompter" : "Pause teleprompter"}
                  >
                    {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Teleprompter
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOverlayVisible(false)}
                  className="gigasocial-teleprompter-toolbar-btn ml-auto rounded-full p-2"
                  aria-label="Hide teleprompter"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {renderStudioScript()}

              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                <button
                  type="button"
                  className="gigasocial-teleprompter-toolbar-btn rounded-xl p-2.5"
                  aria-label="Move teleprompter"
                  onPointerDown={beginCardDrag}
                >
                  <Move className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="gigasocial-teleprompter-toolbar-btn relative rounded-xl p-2.5"
                  aria-label="Edit script"
                  onClick={() => setPanelMode("edit")}
                >
                  <Pencil className="h-5 w-5" />
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-white">
                    <Sparkles className="h-2.5 w-2.5" />
                  </span>
                </button>
                <button
                  type="button"
                  className="gigasocial-teleprompter-toolbar-btn rounded-xl p-2.5"
                  aria-label="Teleprompter settings"
                  onClick={() => setPanelMode("settings")}
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {panelMode === "settings" ? renderStudioSettingsSheet() : null}
        {panelMode === "edit" ? renderStudioEditSheet() : null}

        {panelMode !== "none" ? (
          <button
            type="button"
            className="pointer-events-auto absolute inset-0 z-30 bg-black/35"
            aria-label="Close teleprompter panel"
            onClick={() => setPanelMode("none")}
          />
        ) : null}
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
              fontSize: `${resolvedFontSize}px`,
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
