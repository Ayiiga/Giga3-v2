"use client";

import { SoundLibraryPicker } from "@/components/gigaedit/SoundLibraryPicker";
import { extractAudioFromVideo } from "@/lib/gigaedit/audioExtract";
import {
  handoffAndOpenGigaSocial,
  storePublishHandoff,
} from "@/lib/gigaedit/publishHandoff";
import { enqueuePublishQueue } from "@/lib/gigaedit/publishQueue";
import type {
  GigaEditAudioMixMode,
  GigaEditPublishMediaKind,
  GigaEditPublishPrivacy,
} from "@/lib/gigaedit/publishTypes";
import { saveSound, type GigaEditSoundAsset } from "@/lib/gigaedit/soundLibrary";
import type { ExportAspectRatio } from "@/lib/gigaedit/types";
import { useEffect, useState } from "react";

export type PublishScreenProps = {
  kind: GigaEditPublishMediaKind;
  /** Edited media used for publish (separate from original). */
  editedFile: File;
  /** Original upload — never overwritten. */
  originalFile: File;
  aspectRatio: ExportAspectRatio;
  durationSec?: number;
  projectId?: string;
  aiAssisted?: boolean;
  defaultCaption?: string;
  creatorHandle?: string;
  onClose: () => void;
  onDraftSaved?: () => void;
};

const PRIVACY_OPTIONS: { id: GigaEditPublishPrivacy; label: string; hint: string }[] = [
  {
    id: "public_reusable",
    label: "Public (Reusable)",
    hint: "Anyone can reuse your sound with credit",
  },
  {
    id: "public_no_reuse",
    label: "Public (No Reuse)",
    hint: "Visible publicly; sound stays yours",
  },
  {
    id: "followers",
    label: "Followers Only",
    hint: "Fans / followers audience on GigaSocial",
  },
  {
    id: "private",
    label: "Private",
    hint: "Stay on this device as a draft",
  },
];

export function PublishScreen({
  kind,
  editedFile,
  originalFile,
  aspectRatio,
  durationSec,
  projectId,
  aiAssisted = false,
  defaultCaption = "",
  creatorHandle = "creator",
  onClose,
  onDraftSaved,
}: PublishScreenProps) {
  const [caption, setCaption] = useState(defaultCaption);
  const [privacy, setPrivacy] = useState<GigaEditPublishPrivacy>("public_reusable");
  const [audioMixMode, setAudioMixMode] = useState<GigaEditAudioMixMode>("original");
  const [allowSoundReuse, setAllowSoundReuse] = useState(true);
  const [soundTitle, setSoundTitle] = useState("Original Sound");
  const [selectedSound, setSelectedSound] = useState<GigaEditSoundAsset | null>(null);
  const [replaceAudioFile, setReplaceAudioFile] = useState<File | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(editedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [editedFile]);

  async function prepareAudioPackage(): Promise<{
    audioBlob: Blob | null;
    soundId?: string;
    reuse: boolean;
  }> {
    const reuse =
      privacy === "public_reusable" && allowSoundReuse && audioMixMode !== "mute";

    let audioBlob: Blob | null = null;
    let soundId: string | undefined = selectedSound?.soundId;

    // Best-effort only — never block opening GigaSocial on extract failures/hangs.
    if (kind === "video" && reuse && audioMixMode === "original" && !replaceAudioFile) {
      const extracted = await extractAudioFromVideo(originalFile, {
        maxDurationSec: Math.min(durationSec ?? 30, 30),
        timeoutMs: 4_000,
      });
      if (extracted) {
        audioBlob = extracted.blob;
        const saved = await saveSound({
          title: soundTitle,
          blob: extracted.blob,
          durationSec: extracted.durationSec,
          creatorHandle,
          permission: privacy,
          category: "original",
        });
        soundId = saved?.soundId;
      }
    }

    if (replaceAudioFile && (audioMixMode === "replace" || audioMixMode === "mix")) {
      audioBlob = replaceAudioFile;
      if (reuse && !soundId) {
        const saved = await saveSound({
          title: soundTitle || replaceAudioFile.name,
          blob: replaceAudioFile,
          durationSec: durationSec ?? 0,
          creatorHandle,
          permission: privacy,
          category: selectedSound?.category ?? "device",
        });
        soundId = saved?.soundId;
      }
    }

    return { audioBlob: audioMixMode === "mute" ? null : audioBlob, soundId, reuse };
  }

  async function publishToSocial(destination: "feed" | "reel" | "story") {
    setBusy(true);
    setStatus("Opening GigaSocial…");
    try {
      if (privacy === "private") {
        setStatus("Private is draft-only. Choose Public or Followers to publish.");
        return;
      }
      const { audioBlob, soundId, reuse } = await prepareAudioPackage();
      const result = await handoffAndOpenGigaSocial({
        kind,
        edited: editedFile,
        original: originalFile,
        aspectRatio,
        destination,
        caption,
        privacy,
        projectId,
        durationSec,
        aiAssisted,
        soundId,
        soundTitle: reuse ? soundTitle : undefined,
        audio: audioBlob,
        audioMixMode: audioMixMode === "mute" ? "mute" : audioMixMode,
        allowSoundReuse: reuse,
      });
      if (result.queued) {
        setStatus("You're offline — publish queued. It will sync when you're back online.");
        setBusy(false);
        return;
      }
      if (result.error) {
        setStatus(result.error);
        setBusy(false);
        return;
      }
      // Navigation in progress — keep busy state until unload.
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not prepare publish package.");
      setBusy(false);
    }
  }

  async function saveDraft() {
    setBusy(true);
    try {
      const { audioBlob } = await prepareAudioPackage();
      const handoff = await storePublishHandoff({
        meta: {
          kind,
          projectId,
          fileName: editedFile.name,
          mimeType: editedFile.type || (kind === "video" ? "video/mp4" : "image/png"),
          aspectRatio,
          durationSec,
          caption,
          privacy: "private",
          allowSoundReuse: false,
          audioMixMode: audioMixMode === "mute" ? "mute" : audioMixMode,
          aiAssisted,
          destination: "draft",
        },
        edited: editedFile,
        original: originalFile,
        audio: audioBlob,
      });
      await enqueuePublishQueue({ handoff, destination: "feed" });
      setStatus("Draft saved on this device.");
      onDraftSaved?.();
    } catch {
      setStatus("Could not save draft.");
    } finally {
      setBusy(false);
    }
  }

  function saveToDevice() {
    const url = URL.createObjectURL(editedFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = editedFile.name || `gigaedit-export-${Date.now()}`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Saved edited file to device. Original remains untouched.");
  }

  async function shareExternal() {
    try {
      if (navigator.share && navigator.canShare?.({ files: [editedFile] })) {
        await navigator.share({
          files: [editedFile],
          title: "GigaEdit creation",
          text: caption || "Made with GigaEdit on Giga3 AI",
        });
        setStatus("Shared via device apps.");
        return;
      }
      saveToDevice();
      setStatus("Share API unavailable — downloaded file instead.");
    } catch {
      setStatus("Share cancelled.");
    }
  }

  return (
    <div className="space-y-4" role="region" aria-label="Publish project">
      <div className="text-center">
        <p className="text-2xl" aria-hidden>
          ✅
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight">Your project is ready!</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          GigaSocial is the primary destination. Original media stays safe on this device.
        </p>
      </div>

      <div className="gigaedit-glass overflow-hidden p-2">
        {previewUrl && kind === "video" ? (
          <video src={previewUrl} controls playsInline className="mx-auto max-h-64 rounded-xl" />
        ) : null}
        {previewUrl && kind === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Ready to publish" className="mx-auto max-h-64 rounded-xl object-contain" />
        ) : null}
      </div>

      <label className="block text-xs text-[var(--ge-muted)]">
        Caption
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-sm"
          placeholder="Say something about your creation…"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-[var(--ge-muted)]">Privacy</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRIVACY_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-left ${
                privacy === opt.id
                  ? "border-[var(--ge-gold)] bg-[var(--ge-gold)]/10"
                  : "border-[var(--ge-border)]"
              }`}
            >
              <input
                type="radio"
                name="privacy"
                className="sr-only"
                checked={privacy === opt.id}
                onChange={() => {
                  setPrivacy(opt.id);
                  setAllowSoundReuse(opt.id === "public_reusable");
                }}
              />
              <span className="block text-sm font-medium">{opt.label}</span>
              <span className="block text-[11px] text-[var(--ge-muted)]">{opt.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "video" ? (
        <div className="gigaedit-glass space-y-3 p-3">
          <p className="text-xs font-semibold">Audio before publishing</p>
          <p className="text-[11px] text-[var(--ge-muted)]">
            Original audio is kept by default. Trim/replace/mix/mute without destroying the source file.
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["original", "Keep original"],
                ["mute", "Mute"],
                ["replace", "Replace"],
                ["mix", "Mix"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`rounded-full px-3 py-1 text-[11px] ${
                  audioMixMode === id
                    ? "bg-[var(--ge-gold)] font-bold text-[#0b1220]"
                    : "border border-[var(--ge-border)] text-[var(--ge-muted)]"
                }`}
                onClick={() => setAudioMixMode(id)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="rounded-full border border-[var(--ge-border)] px-3 py-1 text-[11px] text-[var(--ge-muted)]"
              onClick={() => setShowLibrary((v) => !v)}
            >
              Sound library
            </button>
          </div>
          {privacy === "public_reusable" ? (
            <label className="flex items-center gap-2 text-xs text-[var(--ge-muted)]">
              <input
                type="checkbox"
                checked={allowSoundReuse}
                onChange={(e) => setAllowSoundReuse(e.target.checked)}
              />
              Extract as reusable sound (Sound ID + attribution)
            </label>
          ) : null}
          {allowSoundReuse && privacy === "public_reusable" ? (
            <label className="block text-xs text-[var(--ge-muted)]">
              Sound title
              <input
                value={soundTitle}
                onChange={(e) => setSoundTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-sm"
              />
            </label>
          ) : null}
          {selectedSound ? (
            <p className="text-[11px] text-[var(--ge-gold)]">
              Using: {selectedSound.title} · Original Sound by @{selectedSound.creatorHandle}
            </p>
          ) : null}
          {showLibrary ? (
            <SoundLibraryPicker
              viewerHandle={creatorHandle}
              onClose={() => setShowLibrary(false)}
              onSelect={(sound, file) => {
                setSelectedSound(sound);
                setReplaceAudioFile(file);
                setAudioMixMode("replace");
                setSoundTitle(sound.title);
                setShowLibrary(false);
              }}
            />
          ) : null}
          <label className="block text-xs text-[var(--ge-muted)]">
            Or import device audio
            <input
              type="file"
              accept="audio/*"
              className="mt-1 block w-full text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setReplaceAudioFile(file);
                if (file) setAudioMixMode("replace");
              }}
            />
          </label>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-xl bg-[var(--ge-gold)] px-3 py-3 text-sm font-bold text-[#0b1220]"
          onClick={() => void publishToSocial("feed")}
        >
          🚀 Publish to GigaSocial
        </button>
        <button
          type="button"
          disabled={busy || kind !== "video"}
          className="rounded-xl border border-[var(--ge-border)] px-3 py-3 text-sm"
          onClick={() => void publishToSocial("reel")}
        >
          🎬 Share as Reel
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-xl border border-[var(--ge-border)] px-3 py-3 text-sm"
          onClick={() => void publishToSocial("story")}
        >
          📖 Share as Story
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-xl border border-[var(--ge-border)] px-3 py-3 text-sm"
          onClick={() => void saveDraft()}
        >
          💾 Save Draft
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-xl border border-[var(--ge-border)] px-3 py-3 text-sm"
          onClick={saveToDevice}
        >
          📱 Save to Device
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-xl border border-[var(--ge-border)] px-3 py-3 text-sm"
          onClick={() => void shareExternal()}
        >
          Share to External Apps
        </button>
      </div>

      <button
        type="button"
        className="w-full text-center text-xs text-[var(--ge-muted)]"
        onClick={onClose}
      >
        Back to editor
      </button>
      {status ? <p className="text-center text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}
