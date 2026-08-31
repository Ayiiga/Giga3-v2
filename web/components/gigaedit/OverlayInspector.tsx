"use client";

import {
  applyLayoutPreset,
  applyPositionPreset,
  applySmartResize,
  duplicateClipAsOverlay,
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

const LAYOUTS: { id: OverlayLayoutPreset; label: string }[] = [
  { id: "pip-25", label: "PiP 25%" },
  { id: "pip-40", label: "PiP 40%" },
  { id: "pip-50", label: "PiP 50%" },
  { id: "side-by-side", label: "Side by side" },
  { id: "circle-camera", label: "Circle cam" },
  { id: "floating", label: "Floating" },
];

export function OverlayInspector({
  clip,
  clips,
  playheadSec,
  onUpdateClip,
  onDuplicateOverlay,
  onDeleteClip,
}: OverlayInspectorProps) {
  if (!clip || clip.track !== "video") {
    return (
      <p className="text-xs text-[var(--ge-muted)]">
        Select a video clip on the timeline to edit position, mask, and cutout.
      </p>
    );
  }

  const isOverlay = (clip.videoLayer ?? 0) > 0 || clip.clipRole === "overlay";

  function patch(partial: Partial<GigaEditTimelineClip>) {
    onUpdateClip({ ...clip, ...partial });
  }

  return (
    <div className="gigaedit-glass space-y-3 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">{isOverlay ? "Overlay" : "Main clip"} · {clip.label}</h4>
        <button
          type="button"
          className="text-[10px] text-red-300"
          onClick={() => onDeleteClip(clip.id)}
          disabled={clip.locked}
        >
          Delete
        </button>
      </div>

      <label className="block">
        Opacity {(clip.opacity ?? 1).toFixed(2)}
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={clip.opacity ?? 1}
          onChange={(e) => patch({ opacity: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>

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

      <button
        type="button"
        className="gigaedit-cta gigaedit-cta--ghost w-full text-[11px]"
        onClick={() => onDuplicateOverlay(duplicateClipAsOverlay(clip, clips, playheadSec))}
      >
        Duplicate → Overlay
      </button>
    </div>
  );
}
