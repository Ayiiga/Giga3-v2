"use client";

import {
  createTextOverlay,
  normalizeOverlayText,
} from "@/lib/media/videoProject/textOverlays";
import { newOverlayId } from "@/lib/media/videoProject/types";
import type { TextOverlayLayer } from "@/lib/media/videoProject/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type UiLayer = TextOverlayLayer & {
  xPct: number;
  yPct: number;
  scale: number;
  rotationDeg: number;
  color: string;
  blend: string;
};

type TextPosition = "top25" | "center" | "bottom";

const POSITION_PRESET: Record<TextPosition, { label: string; position: TextOverlayLayer["position"]; yPct: number }> = {
  top25: { label: "Top 25%", position: "top", yPct: 12 },
  center: { label: "Center", position: "center", yPct: 46 },
  bottom: { label: "Bottom", position: "bottom", yPct: 80 },
};

const FONT_OPTIONS = [
  { id: "Inter, system-ui, sans-serif", label: "Inter" },
  { id: "Poppins, system-ui, sans-serif", label: "Poppins" },
  { id: "system-ui, sans-serif", label: "System" },
];

const COLOR_OPTIONS = [
  { id: "#ffffff", label: "White" },
  { id: "#EAB308", label: "Yellow" },
  { id: "#000000", label: "Black" },
];

const ANIMATION_OPTIONS: { id: TextOverlayLayer["animation"]; label: string }[] = [
  { id: "fade_in", label: "Fade" },
  { id: "slide_up", label: "Slide" },
  { id: "none", label: "None" },
];

const BLEND_OPTIONS = ["normal", "multiply", "screen", "overlay"];

const DRAFT_KEY = "giga3:media:text-on-video:draft";

function toUiLayer(base: TextOverlayLayer, preset: TextPosition): UiLayer {
  return {
    ...base,
    xPct: 50,
    yPct: POSITION_PRESET[preset].yPct,
    scale: 1,
    rotationDeg: 0,
    color: "#ffffff",
    blend: "normal",
  };
}

function draftPayload(videoUrl: string, layers: UiLayer[]) {
  return { videoUrl, layers, updatedAt: Date.now() };
}

function readDraft(videoUrl: string): UiLayer[] | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { videoUrl?: string; layers?: UiLayer[] };
    if (parsed.videoUrl !== videoUrl || !Array.isArray(parsed.layers)) return null;
    return parsed.layers.filter((l) => typeof l?.text === "string");
  } catch {
    return null;
  }
}

interface TextOnVideoEditorProps {
  videoUrl: string;
  onClose: () => void;
}

/**
 * Text-on-video editor: 9:16 preview, draggable overlay layers with
 * Top 25% / Center / Bottom presets, inspector, timeline strip, and
 * offline draft autosave. Render/burn-in happens in GigaEdits.
 */
export const TextOnVideoEditor = memo(function TextOnVideoEditor({
  videoUrl,
  onClose,
}: TextOnVideoEditorProps) {
  const [layers, setLayers] = useState<UiLayer[]>(() => [
    toUiLayer(
      createTextOverlay({ text: "Your caption here", kind: "caption" }),
      "top25"
    ),
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const saved = readDraft(videoUrl);
    if (saved && saved.length > 0) {
      setLayers(saved);
      setSelectedId(saved[0].id);
      setDraftRestored(true);
    }
  }, [videoUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draftPayload(videoUrl, layers)));
      } catch {
        /* storage full — draft stays in memory */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [videoUrl, layers]);

  const selected = useMemo(
    () => layers.find((l) => l.id === selectedId) ?? null,
    [layers, selectedId]
  );

  const patchSelected = useCallback(
    (patch: Partial<UiLayer>) => {
      if (!selectedId) return;
      setLayers((prev) => prev.map((l) => (l.id === selectedId ? { ...l, ...patch } : l)));
    },
    [selectedId]
  );

  const applyPreset = useCallback(
    (preset: TextPosition) => {
      const p = POSITION_PRESET[preset];
      patchSelected({ position: p.position, yPct: p.yPct });
    },
    [patchSelected]
  );

  function onPreviewPointerDown(e: React.PointerEvent, id: string) {
    const preview = previewRef.current;
    if (!preview) return;
    setSelectedId(id);
    const rect = preview.getBoundingClientRect();
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    dragRef.current = {
      id,
      dx: ((e.clientX - rect.left) / rect.width) * 100 - layer.xPct,
      dy: ((e.clientY - rect.top) / rect.height) * 100 - layer.yPct,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPreviewPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    const preview = previewRef.current;
    if (!drag || !preview) return;
    const rect = preview.getBoundingClientRect();
    const xPct = Math.max(4, Math.min(96, ((e.clientX - rect.left) / rect.width) * 100 - drag.dx));
    const yPct = Math.max(4, Math.min(96, ((e.clientY - rect.top) / rect.height) * 100 - drag.dy));
    setLayers((prev) => prev.map((l) => (l.id === drag.id ? { ...l, xPct, yPct } : l)));
  }

  function endDrag() {
    dragRef.current = null;
  }

  function duplicateSelected() {
    if (!selected) return;
    const clone: UiLayer = {
      ...selected,
      id: newOverlayId(),
      xPct: Math.min(92, selected.xPct + 4),
      yPct: Math.min(92, selected.yPct + 4),
    };
    setLayers((prev) => [...prev, clone]);
    setSelectedId(clone.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedId));
    setSelectedId(null);
    setEditing(false);
  }

  return (
    <div
      className="rounded-[20px] border border-[#2A3441] bg-[#1E293B] p-4"
      data-testid="text-on-video-editor"
    >
      <style>{`@keyframes text-layer-fade{0%,100%{opacity:.55}50%{opacity:1}}@keyframes text-layer-slide{0%,100%{margin-top:0}50%{margin-top:-6px}}@media (prefers-reduced-motion:reduce){.animate-\\[text-layer-fade_1\\.2s_ease-in-out_infinite\\],.animate-\\[text-layer-slide_1\\.2s_ease-in-out_infinite\\]{animation:none}}`}</style>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">
          Text on video{" "}
          <span className="ml-1 rounded bg-[#EAB308] px-1.5 py-0.5 text-[10px] font-bold text-black">
            AI STUDIO
          </span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-full border border-[#2A3441] px-3 py-1 text-xs font-medium text-gray-300"
          aria-label="Close text editor"
        >
          Done
        </button>
      </div>

      <p className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
        Draft auto-saved locally. Original file preserved.
        {draftRestored ? " Previous draft restored." : ""}
      </p>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div
          ref={previewRef}
          className="relative mx-auto aspect-[9/16] w-full max-w-[280px] touch-none select-none overflow-hidden rounded-2xl bg-black"
          onPointerMove={onPreviewPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Video preview with draggable text"
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={videoUrl}
            className="absolute inset-0 z-10 h-full w-full object-cover"
            playsInline
            muted
            loop
            preload="metadata"
            controls
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-1/4 z-30 h-[2px] bg-[#22c55e]/50"
            aria-hidden
            title="Subject-safe boundary — Top 25% keeps faces visible below"
          />
          {layers.map((layer) => {
            const active = layer.id === selectedId;
            return (
              <div
                key={layer.id}
                role="button"
                tabIndex={0}
                aria-label={`Text layer: ${layer.text}. Press Enter to select.`}
                onPointerDown={(e) => onPreviewPointerDown(e, layer.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(layer.id);
                  }
                }}
                className={cn(
                  "absolute z-20 max-w-[90%] cursor-grab touch-none text-center font-bold active:cursor-grabbing",
                  layer.animation === "fade_in" && "animate-[text-layer-fade_1.2s_ease-in-out_infinite]",
                  layer.animation === "slide_up" && "animate-[text-layer-slide_1.2s_ease-in-out_infinite]"
                )}
                style={{
                  left: `${layer.xPct}%`,
                  top: `${layer.yPct}%`,
                  transform: `translate(-50%, -50%) scale(${layer.scale}) rotate(${layer.rotationDeg}deg)`,
                  fontSize: `${Math.max(12, Math.min(28, Math.round(layer.fontSize / 2.4)))}px`,
                  fontFamily: layer.fontFamily,
                  color: layer.color,
                  opacity: layer.opacity,
                  mixBlendMode: layer.blend as React.CSSProperties["mixBlendMode"],
                  textShadow: layer.outline
                    ? "2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 2px 2px 0 #000"
                    : undefined,
                  backgroundColor: layer.background ? "rgba(0,0,0,0.7)" : undefined,
                  padding: layer.background ? "2px 8px" : undefined,
                  borderRadius: layer.background ? 8 : undefined,
                  outline: active ? "2px solid #EAB308" : undefined,
                  outlineOffset: 2,
                }}
              >
                {normalizeOverlayText(layer.text) || "Your caption here"}
                {active ? (
                  <>
                    {["-left-1 -top-1", "-right-1 -top-1", "-left-1 -bottom-1", "-right-1 -bottom-1"].map(
                      (pos) => (
                        <span
                          key={pos}
                          aria-hidden
                          className={cn("absolute h-2 w-2 rounded-full bg-[#EAB308]", pos)}
                        />
                      )
                    )}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {selected ? (
            <>
              {editing ? (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-300">
                    Edit text
                  </span>
                  <textarea
                    value={selected.text}
                    onChange={(e) => patchSelected({ text: e.target.value })}
                    rows={2}
                    autoFocus
                    className="mt-1 w-full rounded-xl border border-[#2A3441] bg-[#0F172A] p-3 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="mt-1 min-h-11 rounded-full bg-[#EAB308] px-4 py-1 text-xs font-bold text-black"
                  >
                    Apply
                  </button>
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#2A3441] px-3 py-1 text-xs font-medium text-white"
                  aria-label="Edit selected text"
                >
                  ✏️ Edit text
                </button>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300">Font</span>
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={selected.fontFamily === f.id}
                    onClick={() => patchSelected({ fontFamily: f.id })}
                    style={{ fontFamily: f.id }}
                    className={cn(
                      "min-h-11 rounded-full border px-3 py-1 text-xs",
                      selected.fontFamily === f.id
                        ? "border-[#EAB308] bg-[#EAB308]/15 text-white"
                        : "border-[#2A3441] text-gray-300"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300">Color</span>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected.color === c.id}
                    aria-label={`${c.label} text`}
                    title={c.label}
                    onClick={() => patchSelected({ color: c.id })}
                    className={cn(
                      "h-8 w-8 rounded-full border-2",
                      selected.color === c.id ? "border-[#EAB308]" : "border-white/30"
                    )}
                    style={{ backgroundColor: c.id }}
                  />
                ))}
                <button
                  type="button"
                  aria-pressed={selected.background}
                  onClick={() => patchSelected({ background: !selected.background })}
                  className={cn(
                    "min-h-11 rounded-full border px-3 py-1 text-xs",
                    selected.background
                      ? "border-[#EAB308] bg-[#EAB308]/15 text-white"
                      : "border-[#2A3441] text-gray-300"
                  )}
                >
                  BG black/70
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-300">Position</span>
                {(Object.keys(POSITION_PRESET) as TextPosition[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={Math.abs(selected.yPct - POSITION_PRESET[preset].yPct) < 6}
                    onClick={() => applyPreset(preset)}
                    title={
                      preset === "top25"
                        ? "Top 25% — keeps the subject visible in the bottom 75%"
                        : POSITION_PRESET[preset].label
                    }
                    className={cn(
                      "min-h-11 rounded-full px-3 py-1 text-xs font-medium",
                      Math.abs(selected.yPct - POSITION_PRESET[preset].yPct) < 6
                        ? "bg-[#EAB308] font-bold text-black"
                        : "border border-[#2A3441] text-gray-300"
                    )}
                  >
                    {POSITION_PRESET[preset].label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-300">Animation</span>
                {ANIMATION_OPTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={selected.animation === a.id}
                    onClick={() => patchSelected({ animation: a.id })}
                    className={cn(
                      "min-h-11 rounded-full border px-3 py-1 text-xs",
                      selected.animation === a.id
                        ? "border-[#EAB308] bg-[#EAB308]/15 text-white"
                        : "border-[#2A3441] text-gray-300"
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300">Size</span>
                <button
                  type="button"
                  aria-label="Decrease font size"
                  onClick={() => patchSelected({ fontSize: Math.max(12, selected.fontSize - 4) })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-lg text-white"
                >
                  −
                </button>
                <span className="min-w-10 text-center text-xs text-white">{selected.fontSize}px</span>
                <button
                  type="button"
                  aria-label="Increase font size"
                  onClick={() => patchSelected({ fontSize: Math.min(96, selected.fontSize + 4) })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-lg text-white"
                >
                  +
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-300">
                Opacity {Math.round(selected.opacity * 100)}%
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selected.opacity}
                  onChange={(e) => patchSelected({ opacity: Number(e.target.value) })}
                  className="flex-1"
                  aria-label="Text opacity"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-300">
                  Scale {selected.scale.toFixed(1)}x
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={selected.scale}
                    onChange={(e) => patchSelected({ scale: Number(e.target.value) })}
                    className="w-full"
                    aria-label="Text scale"
                  />
                </label>
                <label className="text-xs text-gray-300">
                  Rotate {selected.rotationDeg}°
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    step={1}
                    value={selected.rotationDeg}
                    onChange={(e) => patchSelected({ rotationDeg: Number(e.target.value) })}
                    className="w-full"
                    aria-label="Text rotation"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-300">
                  Blend
                  <select
                    value={selected.blend}
                    onChange={(e) => patchSelected({ blend: e.target.value })}
                    className="rounded-lg border border-[#2A3441] bg-[#0F172A] px-2 py-1.5 text-xs text-white"
                    aria-label="Blend mode"
                  >
                    {BLEND_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={duplicateSelected}
                  className="min-h-11 rounded-full border border-[#2A3441] px-3 py-1 text-xs text-white"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[#ef4444]/50 px-3 py-1 text-xs font-bold text-[#ef4444]"
                  aria-label="Delete selected text layer"
                >
                  🗑 Delete
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400">
              No text selected — tap a layer on the preview, or add one below.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              const layer = toUiLayer(createTextOverlay({ text: "New caption", kind: "caption" }), "top25");
              setLayers((prev) => [...prev, layer]);
              setSelectedId(layer.id);
            }}
            className="min-h-11 rounded-full border border-dashed border-[#EAB308] px-4 py-1 text-xs font-bold text-[#EAB308]"
          >
            + Add text layer
          </button>

          <div className="rounded-2xl border border-[#2A3441] p-2">
            <p className="px-1 text-[13px] font-bold text-white">
              Timeline · Main 0/1 · {layers.length} overlay{layers.length === 1 ? "" : "s"}
            </p>
            <p className="px-1 text-[11px] text-gray-400">Swipe timeline sideways</p>
            <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
              <span className="shrink-0 rounded-lg bg-[#0F172A] px-2 py-1 text-[11px] text-gray-300">
                Main · video
              </span>
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setSelectedId(layer.id)}
                  aria-pressed={layer.id === selectedId}
                  className={cn(
                    "shrink-0 rounded-lg bg-[#0F766E] px-2 py-1 text-[11px] text-white",
                    layer.id === selectedId && "ring-2 ring-[#EAB308]"
                  )}
                  title={`Text layer · z20 · ${layer.text.slice(0, 40)}`}
                >
                  Text · z20 · {(normalizeOverlayText(layer.text) || "caption").slice(0, 18)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto" role="toolbar" aria-label="Editor tools">
            {[
              { id: "text", label: "Text", active: true, href: null },
              { id: "split", label: "Split", active: false, href: "/gigaedit/?tab=video" },
              { id: "audio", label: "Audio", active: false, href: "/gigaedit/?tab=audio" },
              { id: "noise", label: "Noise AI", active: false, href: "/gigaedit/?tab=audio" },
              { id: "stickers", label: "Stickers", active: false, href: "/gigaedit/?tab=video" },
            ].map((tool) =>
              tool.href ? (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="min-h-11 shrink-0 rounded-xl border border-[#2A3441] px-3 py-2 text-xs text-gray-300"
                  title={`${tool.label} — available in GigaEdits`}
                >
                  {tool.label} ↗
                </Link>
              ) : (
                <span
                  key={tool.id}
                  className="min-h-11 shrink-0 rounded-xl bg-[#2A3441] px-3 py-2 text-xs font-bold text-white"
                  aria-current="true"
                >
                  {tool.label}
                </span>
              )
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/gigaedit/?tab=video"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#EAB308] px-3 py-2 text-sm font-bold text-black hover:bg-[#d4a017]"
              title="Finish in GigaEdits — overlays, voiceover and export"
            >
              Open in GigaEdits
            </Link>
            <a
              href={videoUrl}
              download
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#2A3441] px-3 py-2 text-sm font-bold text-white"
            >
              Export video
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});
