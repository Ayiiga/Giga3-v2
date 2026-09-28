"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { CurriculumSelector } from "@/components/gigalearn/CurriculumSelector";
import {
  buildHomeworkChatPrompt,
  storeGigaLearnChatHandoff,
} from "@/lib/gigalearn/chatHandoff";
import {
  DEFAULT_CURRICULUM_SELECTION,
  getCountry,
  getCurriculum,
  getLevel,
  getSubject,
  resolveLegacyLevelId,
  resolveSubjectId,
  type CurriculumSelection,
} from "@/lib/gigalearn/curriculumEngine";
import type { ExamBoardId } from "@/lib/gigalearn/curricula";
import { resolveGigaLearnPersona } from "@/lib/gigalearn/personaMap";
import { getGigaLearnProfile, saveGigaLearnProfile } from "@/lib/gigalearn/profile";
import { prepareChatAttachment } from "@/lib/chat/multimodalAttachments";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Camera, ImagePlus, Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";

function examBoardForSelection(selection: CurriculumSelection): ExamBoardId {
  const level = getLevel(resolveLegacyLevelId(selection.levelId));
  if (level?.band === "shs") return "wassce";
  if (level?.band === "jhs") return "bece";
  return "primary";
}

export const GigaLearnHomeworkPanel = memo(function GigaLearnHomeworkPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [selection, setSelection] = useState<CurriculumSelection>(DEFAULT_CURRICULUM_SELECTION);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const profile = getGigaLearnProfile();
    setSelection({
      ...DEFAULT_CURRICULUM_SELECTION,
      levelId: resolveLegacyLevelId(profile.level) || DEFAULT_CURRICULUM_SELECTION.levelId,
      subjectId: resolveSubjectId(profile.subjects[0]) || DEFAULT_CURRICULUM_SELECTION.subjectId,
    });
  }, []);

  const handleFile = useCallback((file: File | null) => {
    setError(null);
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setFileName(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload a photo of your homework (JPG, PNG, or WebP).");
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openChatWithHomework = useCallback(async () => {
    if (!selectedFile) {
      setError("Upload a photo of your homework first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const level = getLevel(resolveLegacyLevelId(selection.levelId));
      const curriculumLabel = getCurriculum(selection.curriculumId)?.label ?? selection.curriculumId;
      const subjectLabel = getSubject(selection.subjectId)?.label ?? selection.subjectId;
      const attachment = await prepareChatAttachment(selectedFile);
      const prompt = buildHomeworkChatPrompt({
        country: getCountry(selection.countryId)?.name,
        curriculum: curriculumLabel,
        subject: subjectLabel,
        level: level?.label,
        grade: level?.gradeLabel,
        strand: selection.strand || undefined,
        subStrand: selection.subStrand || undefined,
        topic: selection.topic || undefined,
        notes,
      });
      storeGigaLearnChatHandoff({
        prompt,
        attachment,
        curriculum: curriculumLabel,
        subject: selection.subjectId,
        level: selection.levelId,
        personaId: resolveGigaLearnPersona({
          toolId: "homework-explain",
          curriculum: curriculumLabel,
        }),
      });
      saveGigaLearnProfile({
        examBoard: examBoardForSelection(selection),
        level: selection.levelId,
        subjects: selection.subjectId ? [selection.subjectId] : [],
      });
      router.push(siteConfig.links.dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare homework image.");
    } finally {
      setBusy(false);
    }
  }, [selectedFile, selection, notes, router]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Take a clear photo of your homework. Giga3 AI will open chat in Education mode with
          vision enabled to analyze the image and solve step by step.
        </p>

        <CurriculumSelector
          value={selection}
          onChange={(next) => setSelection(next)}
          idPrefix="gl-homework"
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            "saas-card flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-accent/30",
            previewUrl && "border-accent/30"
          )}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Homework preview"
              className="max-h-48 rounded-xl border border-border object-contain"
            />
          ) : (
            <>
              <ImagePlus className="h-10 w-10 text-accent" aria-hidden />
              <span className="text-sm font-medium text-foreground">
                Tap to upload or take a photo
              </span>
              <span className="text-xs text-muted">JPG, PNG, or WebP</span>
            </>
          )}
        </button>

        {fileName && (
          <p className="text-xs text-muted">
            <Camera className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {fileName}
          </p>
        )}

        <div>
          <label htmlFor="homework-notes" className="mb-2 block text-sm font-medium text-muted">
            Notes (optional)
          </label>
          <textarea
            id="homework-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Which question number? What part is confusing?"
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy || !selectedFile}
            onClick={() => void openChatWithHomework()}
            className="min-h-11"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MessageSquare className="h-4 w-4" aria-hidden />
            )}
            Solve in chat
          </Button>
          <ButtonLink
            href={`${siteConfig.links.dashboard}?category=education`}
            variant="outline"
            className="min-h-11"
          >
            Open education chat
          </ButtonLink>
        </div>
      </div>

      <div className="saas-card rounded-2xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground">How it works</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Choose your country, curriculum, level and subject for accurate answers.</li>
          <li>Upload a clear photo of the homework question or worksheet.</li>
          <li>Tap Solve in chat — Giga3 opens Education mode with vision AI.</li>
          <li>Review the step-by-step solution and ask follow-up questions.</li>
        </ol>
        <p className="mt-4 text-xs text-muted">
          Tip: Good lighting and a flat surface help the AI read handwriting and diagrams.
        </p>
      </div>
    </div>
  );
});
