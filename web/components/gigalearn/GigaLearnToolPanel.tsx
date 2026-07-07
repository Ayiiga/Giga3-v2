"use client";

import { CreatorResultPanel } from "@/components/creator-studio/CreatorResultPanel";
import { Button } from "@/components/ui/Button";
import { useGigaLearnGeneration } from "@/hooks/useGigaLearnGeneration";
import {
  EDUCATION_LEVELS,
  EXAM_BOARDS,
  SUBJECTS,
} from "@/lib/gigalearn/curricula";
import { getGigaLearnProfile, saveGigaLearnProfile } from "@/lib/gigalearn/profile";
import type { GigaLearnToolDefinition } from "@/lib/gigalearn/tools";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import { memo, useEffect, useState } from "react";

interface GigaLearnToolPanelProps {
  tools: GigaLearnToolDefinition[];
  credits: number | null;
}

export const GigaLearnToolPanel = memo(function GigaLearnToolPanel({
  tools,
  credits,
}: GigaLearnToolPanelProps) {
  const { phase, loading, error, result, run, regenerate, clear } = useGigaLearnGeneration();
  const [activeToolId, setActiveToolId] = useState(tools[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [curriculum, setCurriculum] = useState("bece");
  const [subject, setSubject] = useState("mathematics");
  const [level, setLevel] = useState("jhs-2");

  useEffect(() => {
    const profile = getGigaLearnProfile();
    setCurriculum(profile.examBoard);
    setLevel(profile.level);
    if (profile.subjects[0]) setSubject(profile.subjects[0]);
  }, []);

  const activeTool = tools.find((t) => t.id === activeToolId) ?? tools[0];
  const insufficientCredits = credits != null && credits < (activeTool?.creditCost ?? 2);

  function persistProfile() {
    saveGigaLearnProfile({
      examBoard: curriculum as import("@/lib/gigalearn/curricula").ExamBoardId,
      level,
      subjects: [subject],
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const selected = tool.id === activeToolId;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveToolId(tool.id);
                  clear();
                }}
                className={cn(
                  "saas-card flex min-h-11 items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                  selected
                    ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
                    : "border-border hover:border-accent/25"
                )}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <span>
                  <span className="block text-sm font-medium text-foreground">{tool.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{tool.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Curriculum</label>
            <select
              value={curriculum}
              onChange={(e) => {
                setCurriculum(e.target.value);
                persistProfile();
              }}
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
              onChange={(e) => {
                setSubject(e.target.value);
                persistProfile();
              }}
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
              onChange={(e) => {
                setLevel(e.target.value);
                persistProfile();
              }}
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

        <div>
          <label htmlFor="gigalearn-prompt" className="mb-2 block text-sm font-medium text-muted">
            Your request
          </label>
          <textarea
            id="gigalearn-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder={activeTool?.placeholder}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-accent/20 focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="gigalearn-context" className="mb-2 block text-sm font-medium text-muted">
            Extra context (optional)
          </label>
          <input
            id="gigalearn-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Class size, language preference, specific syllabus topic…"
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={loading || insufficientCredits || !prompt.trim()}
            onClick={() =>
              void run({
                toolId: activeToolId,
                prompt,
                curriculum,
                subject,
                level,
                context,
              })
            }
            className="min-h-11"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            Generate
          </Button>
          {insufficientCredits && (
            <p className="text-xs text-amber-700">Need {activeTool?.creditCost ?? 2} credits.</p>
          )}
          {phase === "success" && (
            <p className="text-xs text-muted">Saved to your learning workspace.</p>
          )}
        </div>
      </div>

      <CreatorResultPanel
        content={result}
        loading={loading}
        error={error}
        onRegenerate={() => void regenerate()}
      />
    </div>
  );
});
