"use client";

import { PublishScreen } from "@/components/gigaedit/PublishScreen";
import { aspectRatioCss } from "@/lib/gigaedit/exportFormats";
import {
  createEmptyProject,
  putProjectOriginalBlob,
  saveGigaEditProject,
} from "@/lib/gigaedit/projects";
import { enqueueGigaEditSync } from "@/lib/gigaedit/offline";
import type { ExportAspectRatio } from "@/lib/gigaedit/types";
import { CAMERA_FILTERS } from "@/lib/gigasocial/cameraFilters";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export function PhotoEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [filterId, setFilterId] = useState("none");
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturate, setSaturate] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<ExportAspectRatio>("1:1");
  const [posterTitle, setPosterTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [publishFile, setPublishFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>();
  const originalRef = useRef<File | null>(null);

  const baseFilter = useMemo(
    () => CAMERA_FILTERS.find((f) => f.id === filterId)?.css ?? "none",
    [filterId]
  );

  const composedFilter = useMemo(() => {
    const extras = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
    return baseFilter === "none" ? extras : `${baseFilter} ${extras}`;
  }, [baseFilter, brightness, contrast, saturate]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  function onPick(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Please choose an image file.");
      return;
    }
    originalRef.current = file;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(URL.createObjectURL(file));
    setStatus("Original preserved. Export creates a new file only.");
  }

  function aiEnhance() {
    setFilterId("hdr");
    setBrightness(1.06);
    setContrast(1.18);
    setSaturate(1.2);
    setStatus("AI Enhance applied (AI-assisted local preview).");
  }

  function portraitImprove() {
    setFilterId("portrait");
    setBrightness(1.05);
    setContrast(0.98);
    setSaturate(1.08);
    setStatus("Portrait improvement preview applied.");
  }

  function renderEditedBlob(): Promise<Blob | null> {
    const img = imgRef.current;
    if (!img || !objectUrl) return Promise.resolve(null);
    const canvas = document.createElement("canvas");
    const w = img.naturalWidth || 1080;
    const h = img.naturalHeight || 1080;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);
    ctx.filter = composedFilter;
    ctx.drawImage(img, 0, 0, w, h);
    if (posterTitle.trim()) {
      ctx.filter = "none";
      ctx.fillStyle = "rgba(11,18,32,0.55)";
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.fillStyle = "#fbbf24";
      ctx.font = `bold ${Math.max(28, Math.floor(w * 0.06))}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(posterTitle.trim(), w / 2, h * 0.88);
    }
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  }

  async function exportPng() {
    const blob = await renderEditedBlob();
    if (!blob) {
      setStatus("Import a photo first.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gigaedit-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Exported a new PNG. Original upload unchanged.");
  }

  async function saveDraft() {
    const project = createEmptyProject({
      kind: "photo",
      title: originalRef.current?.name.replace(/\.[^.]+$/, "") || "Photo project",
      aspectRatio,
    });
    project.filterId = filterId;
    project.brightness = brightness;
    project.contrast = contrast;
    project.saturate = saturate;
    project.overlayText = posterTitle;
    project.aiAssisted = filterId === "hdr" || Boolean(posterTitle);
    project.hasOriginal = Boolean(originalRef.current);
    await saveGigaEditProject(project);
    if (originalRef.current) await putProjectOriginalBlob(project.id, originalRef.current);
    enqueueGigaEditSync({ projectId: project.id, action: "backup" });
    setProjectId(project.id);
    setStatus("Photo draft saved locally.");
    return project.id;
  }

  async function readyToPublish() {
    if (!originalRef.current) {
      setStatus("Import a photo first.");
      return;
    }
    const blob = await renderEditedBlob();
    if (!blob) {
      setStatus("Could not render edited photo.");
      return;
    }
    const id = await saveDraft();
    const edited = new File([blob], `gigaedit-${Date.now()}.png`, { type: "image/png" });
    setProjectId(id);
    setPublishFile(edited);
  }

  if (publishFile && originalRef.current) {
    return (
      <PublishScreen
        kind="photo"
        editedFile={publishFile}
        originalFile={originalRef.current}
        aspectRatio={aspectRatio}
        projectId={projectId}
        aiAssisted={filterId === "hdr" || Boolean(posterTitle)}
        defaultCaption={posterTitle}
        onClose={() => setPublishFile(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Photo editor</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          AI enhance, filters, color, crop framing, posters, thumbnails, and flyers — non-destructive.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220]"
          onClick={() => inputRef.current?.click()}
        >
          Import photo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <button type="button" className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs" onClick={aiEnhance}>
          AI Enhance
        </button>
        <button type="button" className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs" onClick={portraitImprove}>
          Portrait
        </button>
        <button type="button" className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs" onClick={() => void exportPng()}>
          Export PNG
        </button>
        <button type="button" className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs" onClick={() => void saveDraft()}>
          Save draft
        </button>
        <button
          type="button"
          className="rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220]"
          onClick={() => void readyToPublish()}
        >
          Ready to publish
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="gigaedit-glass flex items-center justify-center p-3">
          <div
            className="gigaedit-allow-effects overflow-hidden rounded-xl bg-black"
            style={{ aspectRatio: aspectRatioCss(aspectRatio), width: "min(100%, 420px)" }}
          >
            {objectUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={objectUrl}
                alt="Photo being edited"
                className="h-full w-full object-cover"
                style={
                  {
                    "--ge-filter": composedFilter,
                    filter: "var(--ge-filter)",
                  } as CSSProperties
                }
              />
            ) : (
              <div className="flex h-full min-h-[220px] items-center justify-center p-6 text-center text-xs text-[var(--ge-muted)]">
                Import a photo to enhance, resize, or design a poster.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs text-[var(--ge-muted)]">
            Frame
            <select
              className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-2 py-2 text-sm"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as ExportAspectRatio)}
            >
              <option value="1:1">Square 1:1</option>
              <option value="4:5">Portrait 4:5</option>
              <option value="9:16">Story 9:16</option>
              <option value="16:9">Thumbnail 16:9</option>
            </select>
          </label>
          <label className="block text-xs text-[var(--ge-muted)]">
            Filter
            <select
              className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-2 py-2 text-sm"
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
            >
              {CAMERA_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <Slider label="Brightness" value={brightness} min={0.5} max={1.6} onChange={setBrightness} />
          <Slider label="Contrast" value={contrast} min={0.5} max={1.8} onChange={setContrast} />
          <Slider label="Color" value={saturate} min={0} max={2} onChange={setSaturate} />
          <label className="block text-xs text-[var(--ge-muted)]">
            Poster / flyer / thumbnail title
            <input
              value={posterTitle}
              onChange={(e) => setPosterTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-sm"
              placeholder="AI poster maker text…"
            />
          </label>
        </div>
      </div>

      <p className="text-[11px] text-[var(--ge-muted)]">
        Background/object removal can use AI Studio when online. Local tools never overwrite originals.
        AI-assisted edits are labeled in saved projects.
      </p>
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs text-[var(--ge-muted)]">
      {label} {value.toFixed(2)}
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
      />
    </label>
  );
}
