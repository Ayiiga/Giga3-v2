"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import {
  EDUCATION_LEVELS,
  EXAM_BOARDS,
  SUBJECTS,
} from "@/lib/gigalearn/curricula";
import {
  buildHomeworkChatPrompt,
  storeGigaLearnChatHandoff,
} from "@/lib/gigalearn/chatHandoff";
import { getGigaLearnProfile, saveGigaLearnProfile } from "@/lib/gigalearn/profile";
import { prepareChatAttachment } from "@/lib/chat/multimodalAttachments";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Camera, ImagePlus, Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export const GigaLearnHomeworkPanel = memo(function GigaLearnHomeworkPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [curriculum, setCurriculum] = useState("bece");
  const [subject, setSubject] = useState("mathematics");
  const [level, setLevel] = useState("jhs-2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const profile = getGigaLearnProfile();
    setCurriculum(profile.examBoard);
    setLevel(profile.level);
    if (profile.subjects[0]) setSubject(profile.subjects[0]);
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
      const attachment = await prepareChatAttachment(selectedFile);
      const prompt = buildHomeworkChatPrompt({
        curriculum,
        subject,
        level,
        notes,
      });
      storeGigaLearnChatHandoff({ prompt, attachment, curriculum, subject, level });
      saveGigaLearnProfile({
        examBoard: curriculum as import("@/lib/gigalearn/curricula").ExamBoardId,
        level,
        subjects: [subject],
      });
      router.push(siteConfig.links.dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare homework image.");
    } finally {
      setBusy(false);
    }
  }, [selectedFile, curriculum, subject, level, notes, router]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Take a clear photo of your homework. Giga3 AI will open chat in Education mode with
          vision enabled to analyze the image and solve step by step.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Curriculum</label>
            <select
              value={curriculum}
              onChange={(e) => setCurriculum(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            >
              {EXAM_BOARDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            >
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            >
              {EDUCATION_LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

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
          <li>Upload a clear photo of the homework question or worksheet.</li>
          <li>Choose your curriculum, subject, and level for accurate answers.</li>
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
