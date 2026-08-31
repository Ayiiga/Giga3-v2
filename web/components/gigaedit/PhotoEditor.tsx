"use client";

import {
  CameraStylePreview,
  type CameraStylePreviewHandle,
} from "@/components/gigaedit/CameraStylePreview";
import { PublishScreen } from "@/components/gigaedit/PublishScreen";
import { DEFAULT_CAMERA_LOOK, type CameraLookOptions } from "@/lib/gigaedit/cameraLook";
import { detectDeviceTier } from "@/lib/gigaedit/deviceCapability";
import { aspectRatioCss } from "@/lib/gigaedit/exportFormats";
import {
  createEmptyProject,
  getGigaEditProject,
  getProjectOriginalBlob,
  putProjectOriginalBlob,
  saveGigaEditProject,
} from "@/lib/gigaedit/projects";
import { enqueueGigaEditSync } from "@/lib/gigaedit/offline";
import {
  createManagedObjectUrl,
  renderEditedImageBlob,
  revokeManagedObjectUrl,
} from "@/lib/gigaedit/mediaPipeline";
import { handoffAndOpenGigaSocial } from "@/lib/gigaedit/publishHandoff";
import type { ExportAspectRatio } from "@/lib/gigaedit/types";
import { CAMERA_FILTERS } from "@/lib/gigasocial/cameraFilters";
import { useEffect, useMemo, useRef, useState } from "react";

export type PhotoEditorProps = {
  initialProjectId?: string | null;
  initialAspect?: ExportAspectRatio | null;
  autoImport?: boolean;
};

export function PhotoEditor({
  initialProjectId = null,
  initialAspect = null,
  autoImport = false,
}: PhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewRef = useRef<CameraStylePreviewHandle>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [filterId, setFilterId] = useState("none");
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturate, setSaturate] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<ExportAspectRatio>(initialAspect ?? "1:1");
  const [posterTitle, setPosterTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [publishFile, setPublishFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId ?? undefined);
  const [cameraLook, setCameraLook] = useState<CameraLookOptions>(DEFAULT_CAMERA_LOOK);
  const [exporting, setExporting] = useState(false);
  const originalRef = useRef<File | null>(null);
  const tier = useMemo(() => detectDeviceTier(), []);

  useEffect(() => {
    if (initialAspect) setAspectRatio(initialAspect);
  }, [initialAspect]);

  useEffect(() => {
    if (!autoImport || initialProjectId) return;
    const timer = window.setTimeout(() => inputRef.current?.click(), 150);
    return () => window.clearTimeout(timer);
  }, [autoImport, initialProjectId]);

  useEffect(() => {
    if (!initialProjectId) return;
    let cancelled = false;
    void (async () => {
      const project = await getGigaEditProject(initialProjectId);
      if (!project || cancelled) return;
      setProjectId(project.id);
      setAspectRatio(project.aspectRatio);
      setFilterId(project.filterId || "none");
      setBrightness(project.brightness ?? 1);
      setContrast(project.contrast ?? 1);
      setSaturate(project.saturate ?? 1);
      setPosterTitle(project.overlayText || "");
      const blob = await getProjectOriginalBlob(project.id);
      if (blob && !cancelled) {
        const file = new File([blob], `${project.title || "photo"}.png`, {
          type: blob.type || "image/png",
        });
        originalRef.current = file;
        revokeManagedObjectUrl(objectUrl);
        setObjectUrl(createManagedObjectUrl(file));
        setStatus(`Opened project “${project.title}”. Original preserved.`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per project id
  }, [initialProjectId]);

  const baseFilter = useMemo(
    () => CAMERA_FILTERS.find((f) => f.id === filterId)?.css ?? "none",
    [filterId]
  );

  const manualExtras = useMemo(() => {
    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
  }, [brightness, contrast, saturate]);

  const stackedBaseFilter = useMemo(() => {
    return baseFilter === "none" ? manualExtras : `${baseFilter} ${manualExtras}`;
  }, [baseFilter, manualExtras]);

  useEffect(() => {
    return () => revokeManagedObjectUrl(objectUrl);
  }, [objectUrl]);

  function onPick(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Please choose an image file.");
      return;
    }
    originalRef.current = file;
    revokeManagedObjectUrl(objectUrl);
    setObjectUrl(createManagedObjectUrl(file));
    setStatus("Original preserved. Camera-style preview is non-destructive.");
  }

  function aiEnhance() {
    setFilterId("hdr");
    setBrightness(1.06);
    setContrast(1.18);
    setSaturate(1.2);
    setCameraLook((prev) => ({ ...prev, hdr: true, adaptiveBrightness: true, naturalColors: true }));
    setStatus("AI Enhance applied (AI-assisted local preview).");
  }

  function portraitImprove() {
    setFilterId("portrait");
    setBrightness(1.05);
    setContrast(0.98);
    setSaturate(1.08);
    setCameraLook((prev) => ({ ...prev, portrait: true, naturalColors: true }));
    setStatus("Portrait improvement preview applied.");
  }

  async function renderEditedBlob(): Promise<Blob | null> {
    const img = imgRef.current;
    if (!img || !objectUrl) return null;
    const lookFilter = previewRef.current?.getComposedFilter() ?? stackedBaseFilter;
    return renderEditedImageBlob(img, {
      filterCss: lookFilter,
      overlayText: posterTitle,
      tier,
      mimeType: "image/png",
      aspectRatio,
    });
  }

  async function exportPng() {
    setExporting(true);
    try {
      const blob = await renderEditedBlob();
      if (!blob) {
        setStatus("Import a photo first.");
        return;
      }
      const url = createManagedObjectUrl(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gigaedit-${Date.now()}.png`;
      a.click();
      revokeManagedObjectUrl(url);
      setStatus("Exported a new PNG. Original upload unchanged.");
    } finally {
      setExporting(false);
    }
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
    project.aiAssisted = filterId === "hdr" || Boolean(posterTitle) || cameraLook.portrait;
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
    setExporting(true);
    setStatus("Opening GigaSocial feed…");
    try {
      const blob = await renderEditedBlob();
      if (!blob) {
        setStatus("Could not render edited photo.");
        return;
      }
      const id = await saveDraft();
      const edited = new File([blob], `gigaedit-${Date.now()}.png`, { type: "image/png" });
      setProjectId(id);
      const result = await handoffAndOpenGigaSocial({
        kind: "photo",
        edited,
        original: originalRef.current,
        aspectRatio,
        destination: "feed",
        caption: posterTitle,
        projectId: id,
        aiAssisted: filterId === "hdr" || Boolean(posterTitle) || cameraLook.portrait,
      });
      if (result.queued) {
        setPublishFile(edited);
        setStatus("You're offline — opened publish options. Post will sync when you're back online.");
        return;
      }
      if (result.error) {
        setPublishFile(edited);
        setStatus(`${result.error} — adjust options below, then publish.`);
        return;
      }
      // Full-page navigation to GigaSocial in progress.
    } finally {
      setExporting(false);
    }
  }

  async function openPublishOptions() {
    if (!originalRef.current) {
      setStatus("Import a photo first.");
      return;
    }
    setExporting(true);
    try {
      const blob = await renderEditedBlob();
      if (!blob) {
        setStatus("Could not render edited photo.");
        return;
      }
      const id = await saveDraft();
      const edited = new File([blob], `gigaedit-${Date.now()}.png`, { type: "image/png" });
      setProjectId(id);
      setPublishFile(edited);
    } finally {
      setExporting(false);
    }
  }

  if (publishFile && originalRef.current) {
    return (
      <PublishScreen
        kind="photo"
        editedFile={publishFile}
        originalFile={originalRef.current}
        aspectRatio={aspectRatio}
        projectId={projectId}
        aiAssisted={filterId === "hdr" || Boolean(posterTitle) || cameraLook.portrait}
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
          Pro camera preview with adaptive brightness, HDR, exposure, white balance, portrait, and
          low-light — non-destructive, offline-ready ({tier}-tier device).
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
        <button
          type="button"
          disabled={exporting}
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs disabled:opacity-50"
          onClick={() => void exportPng()}
        >
          {exporting ? "Exporting…" : "Export PNG"}
        </button>
        <button type="button" className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs" onClick={() => void saveDraft()}>
          Save draft
        </button>
        <button
          type="button"
          disabled={exporting}
          className="rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220] disabled:opacity-50"
          onClick={() => void readyToPublish()}
        >
          {exporting ? "Opening…" : "Post to GigaSocial"}
        </button>
        <button
          type="button"
          disabled={exporting}
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs disabled:opacity-50"
          onClick={() => void openPublishOptions()}
        >
          Publish options
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <CameraStylePreview
          ref={previewRef}
          kind="image"
          src={objectUrl}
          imgRef={imgRef}
          aspectRatioCss={aspectRatioCss(aspectRatio)}
          baseFilterCss={stackedBaseFilter}
          look={cameraLook}
          onLookChange={setCameraLook}
          emptyLabel="Import a photo to enhance, resize, or design a poster."
        />

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
