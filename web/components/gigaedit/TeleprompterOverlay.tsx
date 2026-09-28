"use client";

import { loadTeleprompterScript } from "@/lib/gigasocial/teleprompterScripts";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

export type TeleprompterOverlayProps = {
  /** Script text scrolled across the top of the preview. */
  script?: string;
  isVisible?: boolean;
  /** 0.5–1.0, defaults to 0.7 (70% so the subject stays visible below). */
  opacity?: number;
  /** Words per minute for scroll speed. */
  speedWpm?: number;
  recording?: boolean;
  onClose?: () => void;
  onOpacityChange?: (opacity: number) => void;
  onSpeedChange?: (wpm: number) => void;
  className?: string;
};

const MIN_OPACITY = 0.5;
const MAX_OPACITY = 1;

/**
 * Top-25% teleprompter overlay for the video editor preview.
 * Layering contract: video z-10 · overlays/stickers z-20 · teleprompter z-30.
 */
export function TeleprompterOverlay({
  script,
  isVisible = true,
  opacity = 0.7,
  speedWpm = 140,
  recording = true,
  onClose,
  onOpacityChange,
  onSpeedChange,
  className,
}: TeleprompterOverlayProps) {
  const [overlayVisible, setOverlayVisible] = useState(isVisible);
  const [eyeOn, setEyeOn] = useState(true);
  const [fontScale, setFontScale] = useState(1);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [scriptText, setScriptText] = useState(() => script?.trim() || loadTeleprompterScript());

  const clampedOpacity = Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, opacity));
  const effectiveScript = useMemo(() => {
    const next = script?.trim();
    return next || scriptText.trim() || "Add a script — tap Script to edit while recording.";
  }, [script, scriptText]);

  const words = useMemo(
    () => effectiveScript.split(/\s+/).filter(Boolean).length,
    [effectiveScript]
  );
  const durationSec = useMemo(() => {
    const wpm = Math.max(40, speedWpm * speedMultiplier);
    if (words === 0) return 20;
    return Math.min(120, Math.max(8, (words / wpm) * 60));
  }, [words, speedMultiplier, speedWpm]);

  useEffect(() => {
    setOverlayVisible(isVisible);
  }, [isVisible]);

  useEffect(() => {
    const next = script?.trim();
    if (next) setScriptText(next);
  }, [script]);

  useEffect(() => {
    if (overlayVisible) setEyeOn(true);
  }, [overlayVisible]);

  useEffect(() => {
    function syncFromStorage() {
      setScriptText(loadTeleprompterScript());
      setOverlayVisible(true);
      setEyeOn(true);
    }
    window.addEventListener("giga3:teleprompter-open-settings", syncFromStorage);
    window.addEventListener("giga3:teleprompter-show-overlay", syncFromStorage);
    return () => {
      window.removeEventListener("giga3:teleprompter-open-settings", syncFromStorage);
      window.removeEventListener("giga3:teleprompter-show-overlay", syncFromStorage);
    };
  }, []);

  if (!overlayVisible) return null;

  return (
    <div
      className={cn("gigaedit-teleprompter-overlay", className)}
      role="region"
      aria-label="Teleprompter script overlay (top of frame)"
      style={{ backgroundColor: `rgba(0,0,0,${clampedOpacity.toFixed(2)})` }}
      data-recording={recording ? "true" : "false"}
    >
      <div className="gigaedit-teleprompter-overlay__scroll" aria-hidden={!eyeOn}>
        {eyeOn ? (
          <p
            key={`${durationSec}-${fontScale}-${effectiveScript}`}
            className="gigaedit-teleprompter-overlay__text whitespace-pre-wrap"
            style={{
              fontSize: `${0.8 * fontScale}rem`,
              animationDuration: `${durationSec}s`,
              animationPlayState: recording ? "running" : "paused",
            }}
          >
            {effectiveScript}
          </p>
        ) : (
          <p className="gigaedit-teleprompter-overlay__paused">Script hidden — tap 👁️ to resume</p>
        )}
      </div>

      <div className="gigaedit-teleprompter-overlay__controls">
        <span className="gigaedit-teleprompter-overlay__badge">
          TOP · {Math.round(clampedOpacity * 100)}% · Subject visible below
        </span>
        <div className="gigaedit-teleprompter-overlay__buttons">
          <button
            type="button"
            className="gigaedit-teleprompter-overlay__circle-btn"
            aria-label={eyeOn ? "Hide script" : "Show script"}
            aria-pressed={eyeOn}
            onClick={() => setEyeOn((value) => !value)}
          >
            👁️
          </button>
          {onClose ? (
            <button
              type="button"
              className="gigaedit-teleprompter-overlay__circle-btn"
              aria-label="Close teleprompter"
              onClick={onClose}
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <div className="gigaedit-teleprompter-overlay__sliders">
        <label>
          Opacity {Math.round(clampedOpacity * 100)}%
          <input
            type="range"
            min={MIN_OPACITY}
            max={MAX_OPACITY}
            step={0.05}
            value={clampedOpacity}
            onChange={(e) => onOpacityChange?.(Number(e.target.value))}
            aria-label="Teleprompter opacity"
          />
        </label>
        <label>
          Speed {speedMultiplier.toFixed(1)}x
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speedMultiplier}
            onChange={(e) => {
              const next = Number(e.target.value);
              setSpeedMultiplier(next);
              onSpeedChange?.(Math.round(speedWpm * next));
            }}
            aria-label="Teleprompter scroll speed"
          />
        </label>
        <div className="gigaedit-teleprompter-overlay__font">
          <span>Aa</span>
          <button
            type="button"
            aria-label="Decrease script font size"
            onClick={() => setFontScale((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))))}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Increase script font size"
            onClick={() => setFontScale((value) => Math.min(1.6, Number((value + 0.1).toFixed(2))))}
          >
            +
          </button>
        </div>
      </div>

      <div
        className="gigaedit-teleprompter-overlay__safe-line"
        aria-hidden
        title="Subject-safe boundary — keep faces below this line"
      />
    </div>
  );
}
