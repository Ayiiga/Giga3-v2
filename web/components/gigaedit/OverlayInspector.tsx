"use client";

import {
  applyLayoutPreset,
  applyPositionPreset,
  applySmartResize,
  duplicateClipAsOverlay,
  nextOverlayLayer,
} from "@/lib/gigaedit/timelineLayers";
import type {
  GigaEditTimelineClip,
  OverlayLayoutPreset,
  OverlayPositionPreset,
  VideoMaskShape,
  VideoResizeMode,
} from "@/lib/gigaedit/types";

type OverlayInspectorProps = {
  clip: GigaEditTimelineClip | null;
  clips: GigaEditTimelineClip[];
  playheadSec: number;
  onUpdateClip: (clip: GigaEditTimelineClip) => void;
  onDuplicateOverlay: (clip: GigaEditTimelineClip) => void;
  onDeleteClip: (clipId: string) => void;
};

const POSITIONS: OverlayPositionPreset[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const RESIZE_MODES: VideoResizeMode[] = ["fit", "fill", "cover", "contain", "original"];

const BLEND_MODES: { id: GlobalCompositeOperation; label: string }[] = [
  { id: "source-over", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
  { id: "lighten", label: "Lighten" },
  { id: "darken", label: "Darken" },
];

const LAYOUTS: { id: OverlayLayoutPreset; label: string }[] = [
  { id: "pip-25", label: "PiP 25%" },
  { id: "pip-40", label: "PiP 40%" },
  { id: "pip-50", label: "PiP 50%" },
  { id: "side-by-side", label: "Side by side" },
  { id: "circle-camera", label: "Circle cam" },
  { id: "floating", label: "Floating" },
];

function overlayKindLabel(clip: GigaEditTimelineClip): string {
  if (clip.track === "text") return "Text";
  if (clip.track === "sticker") return "Sticker";
  if (clip.track === "effect") return "Effect";
  if ((clip.videoLayer ?? 0) > 0 || clip.clipRole === "overlay") return "Overlay";
  return "Main clip";
}

export function OverlayInspector({
  clip,
  clips,
  playheadSec,
  onUpdateClip,
  onDuplicateOverlay,
  onDeleteClip,
}: OverlayInspectorProps) {
  if (!clip || clip.track === "audio") {
    return (
      <p className="text-xs text-[var(--ge-muted)]">
        Select a video, text, sticker, or logo clip on the timeline to edit position, opacity, and
        layering.
      </p>
    );
  }

  const isOverlay =
    clip.track === "text" ||
    clip.track === "sticker" ||
    clip.track === "effect" ||
    (clip.videoLayer ?? 0) > 0 ||
    clip.clipRole === "overlay";
  const isVideoOverlay = clip.track === "video" && isOverlay;
  const maxLayer = Math.max(0, ...clips.map((c) => c.videoLayer ?? 0));
  const kindLabel = overlayKindLabel(clip);
  // Capture the narrowed non-null clip for closures (TS can't narrow props in callbacks).
  const activeClip: GigaEditTimelineClip = clip;

  function patch(partial: Partial<GigaEditTimelineClip>) {
    onUpdateClip({ ...activeClip, ...partial });
  }

  function bringFront() {
    patch({ videoLayer: maxLayer + 1, clipRole: activeClip.track === "video" ? "overlay" : activeClip.clipRole });
  }

  function sendBack() {
    patch({ videoLayer: Math.max(0, (activeClip.videoLayer ?? 1) - 1) });
  }

  return (
    <div className="gigaedit-glass space-y-3 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">
          {kindLabel} · {clip.label}
          <span className="ml-1.5 font-normal text-[var(--ge-muted)]">
            {clip.track === "video" ? `layer ${clip.videoLayer ?? 0}` : clip.track}
            {typeof clip.opacity === "number" ? ` · ${Math.round(clip.opacity * 100)}%` : ""}
          </span>
        </h4>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-red-400/40 px-2 py-1 text-[10px] font-semibold text-red-300"
          onClick={() => onDeleteClip(clip.id)}
          disabled={clip.locked}
          aria-label={`Delete ${kindLabel} ${clip.label}`}
        >
          🗑 Delete
        </button>
      </div>

      {clip.track === "text" || clip.track === "sticker" ? (
        <label className="block">
          {clip.track === "text" ? "Text" : "Sticker"}
          <input
            value={clip.text ?? ""}
            onChange={(e) => patch({ text: e.target.value, label: e.target.value.slice(0, 18) || clip.label })}
            className="gigaedit-input mt-1 w-full"
          />
        </label>
      ) : null}

      <label className="block">
        Opacity {Math.round((clip.opacity ?? 1) * 100)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clip.opacity ?? 1}
          onChange={(e) => patch({ opacity: Number(e.target.value) })}
          className="mt-1 w-full"
          aria-label="Overlay opacity"
        />
      </label>

      <label className="block">
        Scale {Math.round((clip.scaleX ?? (isVideoOverlay ? 0.4 : 1)) * 100)}%
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.05}
          value={clip.scaleX ?? (isVideoOverlay ? 0.4 : 1)}
          onChange={(e) => {
            const next = Number(e.target.value);
            patch({ scaleX: next, scaleY: next });
          }}
          className="mt-1 w-full"
          aria-label="Overlay scale"
        />
      </label>

      {isVideoOverlay ? (
        <>
          <label className="block">
            Volume {(clip.volume ?? 1).toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={clip.muted ? 0 : (clip.volume ?? 1)}
              onChange={(e) => patch({ volume: Number(e.target.value), muted: Number(e.target.value) === 0 })}
              className="mt-1 w-full"
            />
          </label>

          <label className="block">
            Speed {(clip.speed ?? 1).toFixed(2)}x
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.05}
              value={clip.speed ?? 1}
              onChange={(e) => patch({ speed: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
        </>
      ) : null}

      <label className="block">
        Rotate {clip.rotateDeg ?? 0}°
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={clip.rotateDeg ?? 0}
          onChange={(e) => patch({ rotateDeg: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>

      <div>
        <p className="mb-1 text-[var(--ge-muted)]">Layer order</p>
        <div className="flex flex-wrap gap-1">
          <button type="button" className="gigaedit-chip px-2 py-1 text-[10px]" onClick={bringFront}>
            Bring to front
          </button>
          <button type="button" className="gigaedit-chip px-2 py-1 text-[10px]" onClick={sendBack}>
            Send back
          </button>
        </div>
      </div>

      <label className="block">
        Blend mode
        <select
          className="gigaedit-input mt-1 w-full"
          value={clip.blendMode ?? "source-over"}
          onChange={(e) => patch({ blendMode: e.target.value as GlobalCompositeOperation })}
        >
          {BLEND_MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>

      <div>
        <p className="mb-1 text-[var(--ge-muted)]">Position</p>
        <div className="grid grid-cols-3 gap-1">
          {POSITIONS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="gigaedit-chip px-1 py-1 text-[9px]"
              onClick={() => onUpdateClip(applyPositionPreset(clip, preset))}
            >
              {preset.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {clip.track === "video" ? (
        <div>
          <p className="mb-1 text-[var(--ge-muted)]">Smart resize</p>
          <div className="flex flex-wrap gap-1">
            {RESIZE_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className="gigaedit-chip px-2 py-1 text-[10px] uppercase"
                onClick={() => onUpdateClip(applySmartResize(clip, mode))}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isOverlay ? (
        <div>
          <p className="mb-1 text-[var(--ge-muted)]">Picture in picture</p>
          <div className="flex flex-wrap gap-1">
            {LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                className="gigaedit-chip px-2 py-1 text-[10px]"
                onClick={() => onUpdateClip(applyLayoutPreset(clip, layout.id))}
              >
                {layout.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {clip.track === "video" ? (
        <div>
          <p className="mb-1 text-[var(--ge-muted)]">✂️ Cutout / mask</p>
          <select
            className="gigaedit-input w-full"
            value={clip.maskShape ?? "none"}
            onChange={(e) => patch({ maskShape: e.target.value as VideoMaskShape })}
          >
            <option value="none">None</option>
            <option value="rectangle">Rectangle crop</option>
            <option value="rounded">Rounded rect</option>
            <option value="circle">Circle</option>
            <option value="ellipse">Ellipse</option>
          </select>
          <label className="mt-2 block">
            Crop L/T/R/B
            <div className="mt-1 grid grid-cols-2 gap-1">
              {(["cropLeft", "cropTop", "cropRight", "cropBottom"] as const).map((key) => (
                <input
                  key={key}
                  type="range"
                  min={0}
                  max={0.45}
                  step={0.01}
                  value={clip[key] ?? 0}
                  onChange={(e) => patch({ [key]: Number(e.target.value) })}
                />
              ))}
            </div>
          </label>
          <label className="mt-2 block">
            Chroma key (manual)
            <input
              type="color"
              value={clip.chromaKeyColor ?? "#00ff00"}
              onChange={(e) => patch({ chromaKeyColor: e.target.value, chromaKeyTolerance: clip.chromaKeyTolerance ?? 0.35 })}
              className="mt-1 h-8 w-full"
            />
          </label>
        </div>
      ) : null}

      <button
        type="button"
        className="gigaedit-cta gigaedit-cta--ghost w-full text-[11px]"
        onClick={() => onDuplicateOverlay(duplicateClipAsOverlay(clip, clips, playheadSec))}
      >
        Duplicate → Overlay
      </button>
      <p className="text-[10px] text-[var(--ge-muted)]">
        Layer {clip.videoLayer ?? 0} of {maxLayer} · next overlay uses layer {nextOverlayLayer(clips)}.
        Renders above video (z-20), below teleprompter (z-30).
      </p>
    </div>
  );
}
